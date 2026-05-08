How to use the package in a workspace:
  
1) Install the package and its themes (extract `*.pkg` files into packages folder in your workspace (or application) or use `sencha package add *.pkg` if you have repository configured).

2) Configure your app.json. The package doesn't have styles onboard so you also have to provide one of its existing themes (`bryntum-gantt-theme-classic`, `bryntum-gantt-theme-crisp`, `bryntum-gantt-theme-neptune`, `bryntum-gantt-theme-triton`) 
to the `theme` section:

	{
		"name" : "MyApp",
		"theme": "bryntum-gantt-theme-neptune",
		
		...
		
		// the scheduler and its theme
		"requires" : [
			"bryntum-gantt-pro"
		],
		
		...
	}
