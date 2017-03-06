IllySynth = function(){
	var audio_context;

	var master_volume;
	
	var inst1 = {
		osc1: null,
		osc1_type: "triangle",
		osc2: null,
		osc2_type: "square",
		osc2_detune: 0,
		osc2_freq: 2,
		osc3: null,
		osc3_type: "sine",
		osc3_detune: 0,
		osc3_freq: 0.5,
		filter: null,
		filter_type: "lowshelf",
		filter_gain: 1,
		filter_frequency: 1000,
		filter_Q: 1,
		vol1: null,
		vol2: null,
		vol_master: null,
		vol_master_value: 1
	};

	var inst2 = {
		osc1: null,
		osc1_type: "sawtooth",
		osc2: null,
		osc2_type: "sine",
		osc2_detune: 10,
		osc2_freq: 2,
		osc3: null,
		osc3_type: "sine",
		osc3_detune: 0,
		osc3_freq: 0.5,
		filter: null,
		filter_type: "lowshelf",
		filter_gain: 25,
		filter_frequency: 400,
		filter_Q: 100,
		vol1: null,
		vol2: null,
		vol_master: null,
		vol_master_value: 0.5

	};

	var inst3 = {
		osc1: null,
		osc1_type: "triangle",
		osc2: null,
		osc2_type: "sine",
		osc2_detune: 20,
		osc2_freq: 2,
		osc3: null,
		osc3_type: "sine",
		osc3_detune: 0,
		osc3_freq: 0.5,
		filter: null,
		filter_type: "lowshelf",
		filter_gain: 25,
		filter_frequency: 400,
		filter_Q: 100,
		vol1: null,
		vol2: null,
		vol_master: null,
		vol_master_value: 0.3
	};

	var inst4 = {
		osc1: null,
		osc1_type: "square",
		osc2: null,
		osc2_type: "triangle",
		osc2_detune: 30,
		osc2_freq: 2,
		osc3: null,
		osc3_type: "sine",
		osc3_detune: 0,
		osc3_freq: 0.5,
		filter: null,
		filter_type: "lowshelf",
		filter_gain: 25,
		filter_frequency: 400,
		filter_Q: 100,
		vol1: null,
		vol2: null,
		vol_master: null,
		vol_master_value: 0.2
	};

	var inst5 = {
		osc1: null,
		osc1_type: "sawtooth",
		osc2: null,
		osc2_type: "square",
		osc2_detune: 40,
		osc2_freq: 2,
		osc3: null,
		osc3_type: "sine",
		osc3_detune: 0,
		osc3_freq: 0.5,
		filter: null,
		filter_type: "lowshelf",
		filter_gain: 25,
		filter_frequency: 400,
		filter_Q: 100,
		vol1: null,
		vol2: null,
		vol_master: null,
		vol_master_value: 0.1
	};

	var instruments = [inst1, inst2, inst3, inst4, inst5];

	var init = function(context){
		audio_context = context;

		master_volume = audio_context.createGain();
		master_volume.gain.value = 1;

		// initialize the instruments
		for (var i = 0; i < instruments.length; i++){
			// init elements			
			instruments[i].osc1 = audio_context.createOscillator();
			instruments[i].osc2 = audio_context.createOscillator();
			if(instruments[i].osc3_type){
				instruments[i].osc3 = audio_context.createOscillator();
			}
			
			instruments[i].vol1 = audio_context.createGain();
			instruments[i].vol2 = audio_context.createGain();
			instruments[i].vol_master = audio_context.createGain();

			instruments[i].filter = audio_context.createBiquadFilter();

			// setup oscillators
			instruments[i].osc1.type = instruments[i].osc1_type;
			instruments[i].osc1.frequency.value = 0;
			
			instruments[i].osc2.type = instruments[i].osc2_type;
			instruments[i].osc2.frequency.value = 0;
			instruments[i].osc2.detune.value = instruments[i].osc2_detune;; // value in cents

			if(instruments[i].osc3){
				instruments[i].osc3.type = instruments[i].osc3_type;
				instruments[i].osc3.frequency.value = 0;
				instruments[i].osc3.detune.value = instruments[i].osc3_detune;; // value in cents
			}
			
			// setup envelop
			instruments[i].filter.type = "lowshelf";
			instruments[i].filter.frequency.value = instruments[i].filter_frequency;
			instruments[i].filter.gain.value = instruments[i].filter_gain;
			instruments[i].filter.Q.value = instruments[i].filter_Q;

			// setup gain
			instruments[i].vol1.gain.value = 0.2;
			instruments[i].vol2.gain.value = 0.1;
			instruments[i].vol_master.gain.value = instruments[i].vol_master_value;

			// connect nodes
			instruments[i].osc1.connect(instruments[i].vol1);			
			instruments[i].osc2.connect(instruments[i].vol2);
			if(instruments[i].osc3){
				instruments[i].osc3.connect(instruments[i].vol2);
			}

			instruments[i].vol1.connect(instruments[i].vol_master);
			instruments[i].vol2.connect(instruments[i].vol_master);

			instruments[i].vol_master.connect(instruments[i].filter);
			
			instruments[i].filter.connect(master_volume);

			instruments[i].osc1.start();
			instruments[i].osc2.start();	
			if(instruments[i].osc3){
				instruments[i].osc3.start();
			}		
		}

		master_volume.connect(audio_context.destination);
	};

	var setFreq = function(index, freq){
		if(freq <= 22050){
			instruments[index].osc1.frequency.value = freq;
		}

		if(freq * instruments[index].osc2_freq <= 22050){
			instruments[index].osc2.frequency.value = freq * instruments[index].osc2_freq;
		}
				
		if(instruments[index].osc3 && freq * instruments[index].osc3_freq <= 22050){
			instruments[index].osc3.frequency.value = freq * instruments[index].osc3_freq;
		}
	};

	var setVol = function(index, vol){
		instruments[index].vol_master.gain.value = vol;
	};

	var stopSynth = function (index){
		instruments[index].osc1.stop(0);
		instruments[index].osc2.stop(0);
		if(instruments[index].osc3){
			instruments[index].osc3.stop(0);
		}	
	};

	var startSynth = function (index){
		instruments[index].osc1.start();
		instruments[index].osc2.start();
		if(instruments[index].osc3){
			instruments[index].osc3.start();
		}	
	};

	var setMasterVol = function(new_volume){
		master_volume.gain.value = new_volume;

	};

	return {
    	init: init,
    	setFreq: setFreq,
    	setVol: setVol,
    	stopSynth: stopSynth,
    	startSynth: startSynth,
    	setMasterVol: setMasterVol
  	}
}();