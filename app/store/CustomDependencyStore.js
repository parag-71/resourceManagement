/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: CustomDependencyStore.js
 */
Ext.define("LeankorApp.store.CustomDependencyStore", {
	extend : 'Gnt.data.DependencyStore',
	storeId : 'customDependencyStore',
	model : 'LeankorApp.model.DependencyModelCustom',
 	transitiveDependencyValidation : true,
 	strictDependencyValidation : true,
	enableDependenciesForParentTasks : true,
	proxy: {
		type: 'memory',
	},
	/**
     * Validates a provided dependency and returns a corresponding error code or zero if no error was detected.
     * This method can validate either an existing {@link Gnt.model.Dependency} instance or a proposed (about to be created) link
     * that can be specified as source and target task identifiers plus the dependency type.
     *
     * If you subclass this class, you can provide your own version of this method.
     * Please note that this method is supposed to return a negative integer error code so
     * ensure that you choose some unused values for any new kind of validation.
     * Don't forget to call the parent implementation if you also want to check for cyclic dependencies etc.
     *
     * These scenarios are considered invalid:
     *
     * - a task linking to itself
     * - a dependency between a child and one of its parents
     * - transitive dependencies (this check is done only when {@link #transitiveDependencyValidation} is set to `True`), e.g. if A -> B, B -> C, then A -> C is not valid, or if A -> B, A -> C, then B -> C is not valid
     * - cyclic dependencies, e.g. if A -> B, B -> C, then C -> A is not valid
     *
     * **Note:** This method behavior depends on {@link #transitiveDependencyValidation} and {@link #strictDependencyValidation} option.
     * The first config enables so called _transitivity_ validation. And when {@link #strictDependencyValidation} is turned on,
     * the system tries to detect cycles (and transitivity if {@link #transitiveDependencyValidation} enabled) cases between groups of tasks.
     *
     * The method can be used either by providing a dependency as the first argument (then `toId` and `type` should be omitted):
     *
     *      // checking dependency record
     *      switch (dependencyStore.getDependencyError(dependency)) {
     *          case -3: case -8: case -5:
     *              alert('This dependency builds duplicating transitivity');
     *              break;
     *          case -4: case -7:
     *              alert('This is a cyclic dependency');
     *              break;
     *          ...
     *      }
     *
     * or by providing identifiers of the source and target tasks as well as the type of the dependency (if `type` is not provided it defaults to End-To-Start):
     *
     *      // check if 11 --> 15 dependency is between parent & child
     *      if (dependencyStore.getDependencyError(11, 15) == -9) {
     *          alert('This is a dependency between parent and its child');
     *      }
     *
     * @param {Gnt.model.Dependency/Mixed} dependencyOrFromId Either a dependency or the source task id
     * @param {Mixed} [toId] The target task id. Should be omitted if `dependencyOrFromId` is {@link Gnt.model.Dependency} instance.
     * @param {Number} [type] The type of the dependency. Should be omitted if `dependencyOrFromId` is {@link Gnt.model.Dependency} instance.
     * @param {Gnt.model.Dependency[]/Object[]} [dependenciesToAdd] If provided, validation will be done assuming that the specified records exist in the dependency store.
     * @param {Gnt.model.Dependency[]} [dependenciesToRemove]  If provided, validation will be done assuming that the specified records DO NOT exist in the dependency store.
     * @return {Number} Returns zero if dependency is valid.
     * Full list of possible values is:
     *
     *  - `0`  dependency is valid
     *  - `-1`  other error (wrong input data provided: empty source/target Id(s) or source Id equals target Id)
     *  - `-2`  source (or target) task is not found
     *  - `-3`  transitive dependency (returned only when {@link #transitiveDependencyValidation} is `True`)
     *  - `-4`  cyclic dependency
     *  - `-5`  transitive dependency (dependency being validated is part of larger transitive route) (returned only when {@link #transitiveDependencyValidation} is `True`)
     *  - `-7`  cyclic dependency between groups
     *  - `-8`  transitive dependency between groups (returned only when {@link #transitiveDependencyValidation} is `True`)
     *  - `-9`  dependency between parent and child
     *  - `-10` wrong dependency type
     *  - `-11` dependencies to/from parent tasks not allowed
     *  - `-12` dependencies to projects not allowed
     *  - `-13` dependencies to other project tasks not allowed
     */
    getDependencyError: function(dependencyOrFromId, toId, type, dependenciesToAdd, dependenciesToRemove, calledFromThisDepModel) {
        // `calledFromThisModel` is used when called from `isValid` method of depedency model
        var fromId, fromTask, toTask;
        var modelInput = dependencyOrFromId instanceof Gnt.model.Dependency;
        // Normalize input
        if (modelInput) {
            fromId = dependencyOrFromId.getSourceId();
            fromTask = this.getTaskById(fromId);
            // if dependency provided then `toId` and `type` arguments can be skipped
            dependenciesToAdd = toId;
            dependenciesToRemove = type;
            // if dependency being validated presented in dependenciesToAdd list
            if (dependenciesToAdd && Ext.Array.contains(dependenciesToAdd, dependencyOrFromId)) {
                // make list copy
                dependenciesToAdd = dependenciesToAdd.slice();
                // and remove dependency from it
                Ext.Array.remove(dependenciesToAdd, dependencyOrFromId);
            }
            type = dependencyOrFromId.getType();
            toId = dependencyOrFromId.getTargetId();
            toTask = this.getTaskById(toId);
            // if we've been called with dependencies model as 1st arg (modelInput) and that dependency
            // is already in the dep store, this case is identical to called "isValid" method on the dependency record
            if (dependencyOrFromId.store)  {
                calledFromThisDepModel = dependencyOrFromId;
            }
            
        } else {
            fromId = dependencyOrFromId;
            fromTask = this.getTaskById(fromId);
            toTask = this.getTaskById(toId);
            if (type === undefined) {
                // get default dependency type from the dependency class
                var defaultType = this.model.getField(this.model.prototype.typeField).defaultValue;
                type = defaultType !== undefined ? defaultType : this.model.Type.EndToStart;
            }
        }
        if (!calledFromThisDepModel && modelInput && !dependencyOrFromId.isValid()) {
            return -1;
        } else if (!fromId || !toId || fromId == toId) {
            return -1;
        }
        // Both tasks need to exist for the link to make sense
        if (!fromTask || !toTask)  {
            return -2;
        }
        
        // check dependency type
        if (!this.isValidDependencyType(type))  {
            return -10;
        }
        
        // Also, not allowed to setup a link between a parent and its child
        if (fromTask.contains(toTask) || toTask.contains(fromTask))  {
            return -9;
        }
        
        var depsToIgnore;
        if (dependenciesToRemove || calledFromThisDepModel) {
            depsToIgnore = [];
            // ignore dependency itself during transitivities/cycles search
            if (calledFromThisDepModel)  {
                depsToIgnore.push(calledFromThisDepModel);
            }
            
            if (dependenciesToRemove)  {
                depsToIgnore = depsToIgnore.concat(dependenciesToRemove);
            }
            
        }
        // checking the presence of transitivity in forward direction (fromId -> toId) - prevents actual transitivity
        if (this.transitiveDependencyValidation) {
            if (this.hasTransitiveDependency(fromId, toId, depsToIgnore, dependenciesToAdd))  {
                return -3;
            }
            
        } else {
            // check if tasks are already linked directly
            if (this.areTasksLinkedForward(fromId, toId, depsToIgnore, dependenciesToAdd))  {
                return -3;
            }
            
        }
        // checking the presence of transitivity in backward direction (toId -> fromId) - prevents cycles
        if (this.hasTransitiveDependency(toId, fromId, depsToIgnore, dependenciesToAdd))  {
            return -4;
        }
        
        // checking the presence of transitivity between fromId-task and some of toId-task successors
        // or between some of fromId-task predecessors and toId-task
        // it detects cases when we have 1->2, 1->3 dependencies and validating 2->3 dependency
        // and when we have 2->3, 1->3 dependencies and validating 1->2 dependency
        if (this.transitiveDependencyValidation && this.isPartOfTransitiveDependency(fromId, toId, depsToIgnore, dependenciesToAdd))  {
            return -5;
        }
        
        // if strict dependencies validation mode enabled
        if (this.strictDependencyValidation) {
            // let's check if there is an opposite relation between the tasks parent-child stacks (to prevent cycle)
            if (this.groupsHasTransitiveDependency(toId, fromId, depsToIgnore, dependenciesToAdd))  {
                return -7;
            }
            
            // also check if there is some other relation of the same direction (to prevent transitivity)
            if (this.transitiveDependencyValidation && this.groupsHasTransitiveDependency(fromId, toId, depsToIgnore, dependenciesToAdd))  {
                return -8;
            }
            
        }
        if (!this.allowParentTaskDependencies && (!fromTask.isLeaf() || !toTask.isLeaf()))  {
            return -11;
        }
        
        // project record itself cannot be linked w/ a dependency
        if (toTask.isProject || fromTask.isProject) {
            return -12;
        }
        // children of a project are connectible depending on "AllowDependencies" flag
        var toProject = toTask.getProject(),
            fromProject = fromTask.getProject();
        if (toProject != fromProject) {
            if (toProject && !toProject.getAllowDependencies() || fromProject && !fromProject.getAllowDependencies()) {
                return -13;
            }
        }
	if(toTask.data.ItemType == 'Folder') return -12;
	/*In following block of code we will fecth all successors of the dependent card and store their start date 
	* temporarirly in a temporary variable  */			 
	var recordDataTask = toTask.getSuccessors();
	if(recordDataTask.length){
	    if(fromTask.getSuccessors().length != 0){
		recordDataTask = recordDataTask.concat(fromTask.getSuccessors());
	    }
	}
	else{
	    recordDataTask = fromTask.getSuccessors();
	}
	for(var i=0;i<recordDataTask.length;i++){
		for(var j=0;j<recordDataTask[i].getSuccessors().length;j++){
			recordDataTask.push(recordDataTask[i].getSuccessors()[j]);
		}
	}
	recordDataTask.push(toTask);
	for(var i=0;i<recordDataTask.length;i++){
		recordDataTask[i].data.tempStartDate = recordDataTask[i].data.StartDate;
	}
	return 0;
    },
	listeners : {
		remove : function( store , records , index , isMove , eOpts ) {
			_LOG && console.log('DeleteDependency');
			var dependencyRecordGUUID=[];
			var dependencyGUUID=[];
			Ext.Array.forEach(records, function(record, index) {
				var deleteDependencyObject={
					Id:record.data.Id
				}
				dependencyRecordGUUID.push(record.data.Id);
				dependencyGUUID.push(JSON.stringify(deleteDependencyObject));
			});
			
			var onsuccess=function(result){
				_LOG && console.log('RemoveDependency > Success',result);
			}
			/** Delete Dependency on force.com
			*@param {array of ID of Dependency}        dependencyRecordGUUID
			*/
			glueforce.RemoveDependency(dependencyRecordGUUID, onsuccess)
			onsuccess=function(result){
				_LOG && console.log('DependencyStreaming> DeleteDependency > onsuccess',result);
			}
			glueforce.DependencyStreaming(dependencyGUUID,"DeleteDependency",onsuccess);
			
		}
	}
});
