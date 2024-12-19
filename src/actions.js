module.exports = {
	initActions() {
		let self = this

		let actions = {}

		if (self.config.model == 'usp3') {
			//these actions are only available for the newer usp3 surfaces
			actions.setGPO = {
				name: 'Set GPO On/Off',
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
						label: 'GPO State',
						id: 'state',
						default: '1',
						choices: [
							{ id: '1', label: 'On' },
							{ id: '0', label: 'Off' },
						],
					},
				],
				callback: async (event) => {
					self.sendUSPCommand(`GPO_${event.options.gpo}:${event.options.state}`)
				},
			}

			actions.setGPOAll = {
				name: 'Set All GPO On/Off',
				options: [
					{
						type: 'dropdown',
						label: 'GPO State',
						id: 'state',
						default: '1',
						choices: [
							{ id: '1', label: 'On' },
							{ id: '0', label: 'Off' },
						],
					},
				],
				callback: async (event) => {
					self.sendUSPCommand(`GPO_00:${event.options.state}`)
				},
			}

			if (this.config.use_as_surface == false) {
				//these actions are only available if the device is not used as a surface
				actions.pressKey = {
					name: 'Press Key',
					options: [
						{
							type: 'dropdown',
							label: 'Key Number',
							id: 'key',
							default: this.KEY_LIST[0].id,
							choices: this.KEY_LIST,
						},
					],
					callback: async (event) => {
						self.sendUSPCommand(`KYP_${event.options.key}:1`)
					},
				}

				actions.setKeyText = {
					name: 'Set Key Text',
					options: [
						{
							type: 'dropdown',
							label: 'Key Number',
							id: 'key',
							default: this.KEY_LIST[0].id,
							choices: this.KEY_LIST,
						},
						{
							type: 'textinput',
							label: 'Text',
							id: 'text',
							default: '',
						},
					],
					callback: async (event) => {
						if (self.config.font_size === undefined) {
							self.config.font_size = 0
						}

						let font_size = self.config.font_size

						let keyNumber = event.options.key
						let keyText = await self.parseVariablesInString(event.options.text)

						// Check if there is a title/text on the button?
						if (keyText.length > 0) {
							// If the text includes a line break, replace it with a space
							if (keyText.includes('\\n')) {
								keyText = keyText.split('\\n').join(' ')
							}

							//if the text includes a _, remove it because this interferes with the protocol, replace it with a space
							if (keyText.includes('_')) {
								keyText = keyText.split('_').join(' ')
							}
						} else {
							keyText = ' '
						}

						//now check the number of characters in the text, and if it is too long, adjust the font size and lines (as long as the user has not set the font size manually)
						if (font_size == 'auto') {
							if (keyText.length < 4) {
								font_size = 2
							} else if (keyText.length < 8) {
								font_size = 1
							} else {
								font_size = 0
							}
						}

						self.sendUSPCommand(`TXT_${String(keyNumber).padStart(2, '0')}:${font_size}_${keyText}`)
					},
				}
			}
		}

		this.setActionDefinitions(actions)
	},
}
