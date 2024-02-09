module.exports = {
	initVariables() {
		let self = this;

		let variables = [];

		variables.push({ variableId: 'usp_connected', name: 'Connected to USP Panel' });
		
		if (self.config.use_as_surface) {
			variables.push({ variableId: 'companion_connected', name: 'Connected to Companion Satellite API' });
		}

		if (self.config.model == 'usp3') {
			for (let i = 0; i < this.GPI_LIST.length; i++) {
				let gpi = this.GPI_LIST[i];
				variables.push({ variableId: `gpi_${gpi.id}`, name: `GPI ${gpi.id} State` });
			}
	
			for (let i = 0; i < this.GPO_LIST.length; i++) {
				let gpo = this.GPO_LIST[i];
				variables.push({ variableId: `gpo_${gpo.id}`, name: `GPO ${gpo.id} State` });
			}
	
			for (let i = 0; i < this.MEM_LIST.length; i++) {
				let mem = this.MEM_LIST[i];
				variables.push({ variableId: `mem_${mem.id}`, name: `MEM ${mem.id} State` });
			}
	
			if (!self.config.use_as_surface) {
				for (let i = 0; i < this.KEY_LIST.length; i++) {
					let key = this.KEY_LIST[i];
					variables.push({ variableId: `key_${key.id}`, name: `KEY ${key.id} State` });
				}
			}
		}		

		self.setVariableDefinitions(variables);
	},

	checkVariables() {
		let self = this;

		try {
			let variableObj = {};
			if (self.DATA.uspConnected !== undefined) {
				variableObj['usp_connected'] = self.DATA.uspConnected ? 'True' : 'False';
			}

			if (self.config.use_as_surface) {
				if (self.DATA.satelliteConnected !== undefined) {
					variableObj['companion_connected'] = self.DATA.satelliteConnected ? 'True' : 'False';
				}
			}

			if (self.config.model == 'usp3') {
				for (let i = 0; i < self.DATA.gpiStates.length; i++) {
					let gpi = self.DATA.gpiStates[i];
					variableObj[`gpi_${gpi.id}`] = gpi.state ? 'On' : 'Off';
				};

				for (let i = 0; i < self.DATA.gpoStates.length; i++) {
					let gpo = self.DATA.gpoStates[i];
					variableObj[`gpo_${gpo.id}`] = gpo.state ? 'On' : 'Off';
				};

				for (let i = 0; i < self.DATA.memStates.length; i++) {
					let mem = self.DATA.memStates[i];
					variableObj[`mem_${mem.id}`] = mem.state ? 'On' : 'Off';
				};

				if (!self.config.use_as_surface) {
					for (let i = 0; i < self.DATA.keyStates.length; i++) {
						let key = self.DATA.keyStates[i];
						variableObj[`key_${key.id}`] = key.state ? 'On' : 'Off';
					};
				}
			}

			self.setVariableValues(variableObj);
		}
		catch(error) {
			self.log('error', `Error checking variables: ${error.toString()}`);
		}
	}
}