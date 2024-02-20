const { combineRgb } = require('@companion-module/base');

module.exports = {
	initPresets() {
		let self = this;

		let presets = [];

		if (self.config.model == 'usp3') {
			if (self.config.use_as_surface == false) {
				for (var i = 0; i < this.KEY_LIST.length; i++) {
					let keyObj = this.KEY_LIST[i];
					let presetObj = {
						type: 'button',
						category: 'Key Press',
						name: keyObj.label,
						style: {
							text: keyObj.label,
							size: '12',
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(0, 0, 0),
						},
						steps: [
							{
								down: [
									{
										actionId: 'pressKey',
										options: {
											key: keyObj.id,
										}
									}
								],
								up: []
							}
						],
						feedbacks: [
							{
								feedbackId: 'keyState',
								options: {
									key: keyObj.id,
									state: '1',
								},
								style: {
									bgcolor: combineRgb(255, 0, 0),
								},
							}
						],
					}
	
					presets.push(presetObj)
				}
			}		
	
			for (var i = 0; i < this.GPI_LIST.length; i++) {
				let gpiObj = this.GPI_LIST[i];
				let presetObj = {
					type: 'button',
					category: 'GPI States',
					name: gpiObj.label,
					style: {
						text: gpiObj.label,
						size: '12',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [],
							up: []
						}
					],
					feedbacks: [
						{
							feedbackId: 'gpiState',
							options: {
								gpi: gpiObj.id,
								state: '1',
							},
							style: {
								bgcolor: combineRgb(255, 0, 0),
							},
						}
					],
				}
	
				presets.push(presetObj)
			}
	
			for (var i = 0; i < this.GPO_LIST.length; i++) {
				let gpoObj = this.GPO_LIST[i];
				let presetObj = {
					type: 'button',
					category: 'GPO Control - ON',
					name: gpoObj.label,
					style: {
						text: gpoObj.label + ' ON',
						size: '12',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [
								{
									actionId: 'setGPO',
									options: {
										gpo: gpoObj.id,
										state: '1',
									}
								}
							],
							up: []
						}
					],
					feedbacks: [
						{
							feedbackId: 'gpoState',
							options: {
								gpi: gpoObj.id,
								state: '1',
							},
							style: {
								bgcolor: combineRgb(255, 0, 0),
							},
						}
					],
				}
	
				presets.push(presetObj)
			}
	
			let presetGPOAllOnObj = {
				type: 'button',
				category: 'GPO Control - ON',
				name: 'All GPO ON',
				style: {
					text: 'All GPO ON',
					size: '12',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: 'setGPOAll',
								options: {
									state: '1',
								}
							}
						],
						up: []
					}
				],
				feedbacks: [],
			}
			presets.push(presetGPOAllOnObj);
	
			for (var i = 0; i < this.GPO_LIST.length; i++) {
				let gpoObj = this.GPO_LIST[i];
				let presetObj = {
					type: 'button',
					category: 'GPO Control - OFF',
					name: gpoObj.label,
					style: {
						text: gpoObj.label + ' OFF',
						size: '12',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [
								{
									actionId: 'setGPO',
									options: {
										gpo: gpoObj.id,
										state: '0',
									}
								}
							],
							up: []
						}
					],
					feedbacks: [
						{
							feedbackId: 'gpoState',
							options: {
								gpi: gpoObj.id,
								state: '0',
							},
							style: {
								bgcolor: combineRgb(255, 0, 0),
							},
						}
					],
				}
	
				presets.push(presetObj)
			}
	
			let presetGPOAllOffObj = {
				type: 'button',
				category: 'GPO Control - OFF',
				name: 'All GPO OFF',
				style: {
					text: 'All GPO OFF',
					size: '12',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: 'setGPOAll',
								options: {
									state: '0',
								}
							}
						],
						up: []
					}
				],
				feedbacks: [],
			}
			presets.push(presetGPOAllOffObj);
		}

		this.setPresetDefinitions(presets);
	}
}