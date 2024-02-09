const { combineRgb } = require('@companion-module/base');

module.exports = {
	initFeedbacks() {
		let self = this;

		let feedbacks = {};

		if (self.config.model == 'usp3') {
			feedbacks.gpiState = {
				type: 'boolean',
				name: 'GPI Number is in X State',
				description: 'Show feedback for GPI State',
				options: [
					{
						type: 'dropdown',
						label: 'GPI Number',
						id: 'gpi',
						default: this.GPI_LIST[0].id,
						choices: this.GPI_LIST,
					},
					{
						type: 'dropdown',
						label: 'State',
						id: 'state',
						default: '1',
						choices: [
							{ id: '1', label: 'On' },
							{ id: '0', label: 'Off' }
						]
					},
				],
				defaultStyle: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(255, 0, 0)
				},
				callback: (event) => {
					let opt = event.options;
					let gpi = self.DATA.gpiStates.find(g => g.id == opt.gpi);
	
					if (gpi) {
						if (gpi.state == parseInt(opt.state)) {
							return true;
						}
					}
	
					return false;
				}
			};
	
			feedbacks.gpoState = {
				type: 'boolean',
				name: 'GPO Number is in X State',
				description: 'Show feedback for GPO State',
				options: [
					{
						type: 'dropdown',
						label: 'GPO Number',
						id: 'gpo',
						default: this.GPO_LIST[0].id,
						choices: this.GPO_LIST,
					},
					{
						type: 'dropdown',
						label: 'State',
						id: 'state',
						default: '1',
						choices: [
							{ id: '1', label: 'On' },
							{ id: '0', label: 'Off' }
						]
					}
				],
				defaultStyle: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(255, 0, 0)
				},
				callback: (event) => {
					let opt = event.options;
					let gpo = self.DATA.gpoStates.find(g => g.id == opt.gpo);
	
					if (gpo) {
						if (gpo.state == parseInt(opt.state)) {
							return true;
						}
					}
	
					return false;
				}
			};
	
			feedbacks.memState = {
				type: 'boolean',
				name: 'Mem Number is in X State',
				description: 'Show feedback for Mem State',
				options: [
					{
						type: 'dropdown',
						label: 'Mem Number',
						id: 'mem',
						default: this.MEM_LIST[0].id,
						choices: this.MEM_LIST,
					},
					{
						type: 'dropdown',
						label: 'State',
						id: 'state',
						default: '1',
						choices: [
							{ id: '1', label: 'On' },
							{ id: '0', label: 'Off' }
						]
					},
				],
				defaultStyle: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(255, 0, 0)
				},
				callback: (event) => {
					let opt = event.options;
					let mem = self.DATA.memStates.find(g => g.id == opt.mem);
	
					if (mem) {
						if (mem.state == parseInt(opt.state)) {
							return true;
						}
					}
	
					return false;
				},
			};
	
			if (!self.config.use_as_surface) {
				feedbacks.keyState = {
					type: 'boolean',
					name: 'Key Number is in X State',
					description: 'Show feedback for Key State',
					options: [
						{
							type: 'dropdown',
							label: 'Key Number',
							id: 'key',
							default: this.KEY_LIST[0].id,
							choices: this.KEY_LIST,
						},
						{
							type: 'dropdown',
							label: 'State',
							id: 'state',
							default: '1',
							choices: [
								{ id: '1', label: 'Pressed' },
								{ id: '0', label: 'Not Pressed' }
							]
						},
					],
					defaultStyle: {
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(255, 0, 0)
					},
					callback: (event) => {
						let opt = event.options;
						let key = self.DATA.keyStates.find(g => g.id == opt.key);
		
						if (key) {
							if (key.state == parseInt(opt.state)) {
								return true;
							}
						}
		
						return false;
					}
				};
			}
		}

		self.setFeedbackDefinitions(feedbacks);
	}
}