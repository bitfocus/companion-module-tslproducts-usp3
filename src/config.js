const { Regex } = require('@companion-module/base')

module.exports = {
	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info1',
				width: 12,
				label: 'Information',
				value:
					'This module will allow you to use a TSL Products or DNF Controls Universal Switch Panel with Companion.<hr />',
			},
			{
				type: 'dropdown',
				id: 'model',
				label: 'Model of USP Panel',
				width: 12,
				default: 'usp3',
				choices: [
					{ id: 'usp3', label: 'TSL Products USP3 Panels' },
					{ id: 'usp_legacy', label: 'DNF Controls USP-8 or USP-16 Panel' },
				],
			},
			{
				type: 'textinput',
				id: 'host_usp',
				label: 'IP Address of USP Panel',
				width: 3,
				default: '',
				regex: Regex.IP,
			},
			{
				type: 'static-text',
				id: 'info3',
				width: 12,
				label: '',
				value: '<hr />',
			},
			{
				type: 'static-text',
				id: 'satellite_surface_info_usp_legacy',
				width: 12,
				label: 'Companion Satellite Surface Configuration',
				value: 'This module allows you to use your DNF Controls USP panel as a satellite surface in Companion.',
				isVisible: (configValues) => configValues.model == 'usp_legacy',
			},
			{
				type: 'static-text',
				id: 'satellite_surface_info_usp3',
				width: 12,
				label: 'Companion Satellite Surface Configuration',
				value:
					'This module allows you to use your TSL Products USP3 panel as a satellite surface in Companion. If disabled, you can use Companion to send commands to the USP3 panel instead.',
				isVisible: (configValues) => configValues.model == 'usp3',
			},
			{
				type: 'checkbox',
				id: 'use_as_surface',
				label: 'Use as a Satellite Surface in Companion',
				width: 3,
				default: true,
				isVisible: (configValues) => configValues.model == 'usp3', //only show this option if the model is USP3 since the legacy USP is satellite only
			},
			{
				type: 'textinput',
				id: 'port_companion',
				label: 'TCP Port configured for Companion Satellite (default: 16622)',
				width: 3,
				default: '16622',
				regex: Regex.PORT,
				isVisible: (configValues) => configValues.use_as_surface == true,
			},
			{
				type: 'checkbox',
				id: 'auto_configure',
				label: 'Auto-Configure USP Panel to work as a surface in Companion',
				width: 12,
				default: true,
				isVisible: (configValues) => configValues.use_as_surface == true,
			},
			{
				//this is a hidden field that is used to determine if the panel has already been auto-configured
				type: 'checkbox',
				id: 'already_configured',
				label: 'Already Auto-Configured',
				width: 12,
				default: false,
				isVisible: (configValues) => false,
			},
			{
				type: 'static-text',
				id: 'already_configured_info',
				width: 12,
				label: '',
				value: 'This panel has already been auto-configured to work as a surface in Companion.',
				isVisible: (configValues) =>
					configValues.already_configured == true &&
					configValues.use_as_surface == true &&
					configValues.auto_configure == true,
			},
			{
				type: 'checkbox',
				id: 'rerun_configuration',
				label: 'Re-run auto configuration of Panel upon saving module config',
				width: 12,
				default: false,
				isVisible: (configValues) =>
					configValues.use_as_surface == true &&
					configValues.auto_configure == true &&
					configValues.already_configured == true,
			},
			{
				type: 'dropdown',
				id: 'port_usp',
				label: 'Remote Device Port as configured on USP3 Panel',
				width: 6,
				default: '50001',
				choices: [
					{ id: '50001', label: 'Remote Device 1: 50001' },
					{ id: '50002', label: 'Remote Device 2: 50002' },
					{ id: '50003', label: 'Remote Device 3: 50003' },
					{ id: '50004', label: 'Remote Device 4: 50004' },
					{ id: '50005', label: 'Remote Device 5: 50005' },
					{ id: '50006', label: 'Remote Device 6: 50006' },
					{ id: '50007', label: 'Remote Device 7: 50007' },
					{ id: '50008', label: 'Remote Device 8: 50008' },
				],
				isVisible: (configValues) =>
					configValues.model == 'usp3' &&
					(configValues.auto_configure == false || configValues.use_as_surface == false),
			},
			{
				type: 'dropdown',
				id: 'usp_device_id',
				label: 'Device ID to use for Remote Device Assignment',
				width: 6,
				default: '0',
				choices: [
					{ id: '0', label: 'Device #1' },
					{ id: '1', label: 'Device #2' },
					{ id: '2', label: 'Device #3' },
					{ id: '3', label: 'Device #4' },
					{ id: '4', label: 'Device #5' },
					{ id: '5', label: 'Device #6' },
					{ id: '6', label: 'Device #7' },
					{ id: '7', label: 'Device #8' },
					{ id: '8', label: 'Device #9' },
					{ id: '9', label: 'Device #10' },
					{ id: '10', label: 'Device #11' },
					{ id: '11', label: 'Device #12' },
					{ id: '12', label: 'Device #13' },
					{ id: '13', label: 'Device #14' },
					{ id: '14', label: 'Device #15' },
					{ id: '15', label: 'Device #16' },
					{ id: '16', label: 'Device #17' },
					{ id: '17', label: 'Device #18' },
					{ id: '18', label: 'Device #19' },
					{ id: '19', label: 'Device #20' },
				],
				isVisible: (configValues) =>
					configValues.model == 'usp_legacy' &&
					configValues.use_as_surface == true &&
					configValues.auto_configure == true &&
					configValues.already_configured !== true,
			},
			{
				type: 'textinput',
				id: 'port_usp_legacy',
				label: 'UDP Port (SNMP) as configured on Panel to send data back to Companion',
				width: 3,
				default: '1024',
				regex: Regex.Port,
				isVisible: (configValues) => configValues.model == 'usp_legacy' && configValues.auto_configure == false,
			},
			{
				type: 'static-text',
				id: 'info4',
				width: 12,
				label: 'Setting the USP Port',
				value:
					'This Port must be unique for each panel and Companion module instance. The commands are sent over UDP, so make sure the panel and Companion are able to communicate over the same subnet.',
				isVisible: (configValues) => configValues.model == 'usp_legacy' && configValues.auto_configure == false,
			},
			{
				type: 'dropdown',
				id: 'font_size',
				label:
					'Preferred Font Size to use on Buttons. Remember that the amount of text that can fit on a button is limited.',
				width: 12,
				default: 'auto',
				choices: [
					{ id: 'auto', label: 'Auto Scale' },
					{ id: '0', label: 'Small' },
					{ id: '1', label: 'Medium' },
					{ id: '2', label: 'Large' },
				],
				isVisible: (configValues) => configValues.use_as_surface == true,
			},
			{
				type: 'static-text',
				id: 'info5',
				width: 12,
				label: '',
				value: '<hr />',
				isVisible: (configValues) => configValues.use_as_surface == false,
			},
			{
				type: 'checkbox',
				id: 'polling',
				label:
					'Enable Polling - This will poll the USP panel for button states and update Companion with the current state of the panel.',
				width: 6,
				default: false,
				isVisible: (configValues) => configValues.use_as_surface == false && configValues.model == 'usp3',
			},
			{
				type: 'number',
				id: 'poll_interval',
				label: 'Polling Interval (ms)',
				min: 50,
				max: 30000,
				default: 1000,
				width: 6,
				isVisible: (configValues) => configValues.polling == true && configValues.use_as_surface == false,
			},
			{
				type: 'static-text',
				id: 'info6',
				width: 12,
				label: '',
				value: '<hr />',
			},
			{
				type: 'checkbox',
				id: 'verbose',
				label:
					'Enable Verbose Logging - This will log all commands sent to the USP panel and all responses received from the panel.',
				width: 12,
			},
			{
				type: 'static-text',
				id: 'info7',
				width: 12,
				label: '',
				value: '<hr />',
			},
			{
				type: 'checkbox',
				id: 'advanced_config',
				label: 'Show Advanced Configuration Options',
				width: 12,
				default: false,
			},
			{
				type: 'static-text',
				id: 'advanced_config_info',
				width: 12,
				label: '',
				value:
					'Only change these settings if you know what you are doing. These settings are not required for normal operation.',
			},
			{
				type: 'static-text',
				id: 'advanced_config_no_settings',
				width: 6,
				label: '',
				value: 'There are no advanced settings available when not using the USP panel as a surface.',
				isVisible: (configValues) => configValues.advanced_config == true && configValues.use_as_surface == false,
			},
			{
				type: 'number',
				id: 'advanced_config_usp_legacy_panel_delay_time',
				label: 'DNF Controls USP Panel Delay Time between Updates (ms)',
				min: 100,
				max: 30000,
				default: 3000,
				width: 6,
				isVisible: (configValues) => configValues.advanced_config == true && configValues.model == 'usp_legacy',
			},
			{
				type: 'static-text',
				id: 'advanced_config_usp_legacy_panel_delay_time_info',
				width: 6,
				label: '',
				value:
					'This is the amount of time between updates sent to the DNF Controls USP panel. This older USP panel can only handle a certain amount of data at a time without crashing, so this setting can be used to slow down the updates to the panel. The default value is 3000ms (3 seconds).',
				isVisible: (configValues) => configValues.advanced_config == true && configValues.model == 'usp_legacy',
			},
			{
				type: 'dropdown',
				id: 'advanced_usp_panel_default_unsupported_color',
				label: 'USP Panel Default Unsupported Button Color',
				default: 2,
				choices: [
					{ id: 0, label: 'Dark' },
					{ id: 1, label: 'Red' },
					{ id: 2, label: 'Green' },
					{ id: 3, label: 'Amber' },
				],
				width: 6,
				isVisible: (configValues) => configValues.advanced_config == true && configValues.use_as_surface == true,
			},
			{
				type: 'static-text',
				id: 'advanced_config_usp_panel_default_unsupported_color_info',
				width: 6,
				label: '',
				value:
					'This is the default color to use for button colors that are not supported on the panel. The default value is Green.',
				isVisible: (configValues) => configValues.advanced_config == true && configValues.use_as_surface == true,
			},
			{
				type: 'dropdown',
				id: 'advanced_usp_panel_default_dark_color',
				label: 'USP Panel Replace Dark Button Color',
				default: 0,
				choices: [
					{ id: 0, label: 'Leave Dark' },
					{ id: 1, label: 'Red' },
					{ id: 2, label: 'Green' },
					{ id: 3, label: 'Amber' },
				],
				width: 6,
				isVisible: (configValues) => configValues.advanced_config == true && configValues.use_as_surface == true,
			},
			{
				type: 'static-text',
				id: 'advanced_config_usp_panel_default_dark_color_info',
				width: 6,
				label: '',
				value:
					'This is the replacement color to use for button colors when the button in Companion is set to a dark color, which can be difficult to read on the USP panel.',
				isVisible: (configValues) => configValues.advanced_config == true && configValues.use_as_surface == true,
			},
		]
	},
}
