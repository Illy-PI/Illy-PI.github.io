//Inspired from https://github.com/cwilso/PitchDetect
//v0.045

// TODO
// opening sound
// make sure harmonics are legit,
// improve dnu response
// refactor controls and visuals out
// adjust for background noise


// issues
// rotate slower
// colour change too fast
// pitch rotation toooo fast

// Done
// Viz.setShellMaterialColor("0x101010"); for harmonics 100000, 001000, 000010
// timbre
// if did not understand anything
// too short/long
IllyAudio = function() {
	var context;
	var source;
	var analyser;
	var buffer;
	var audioBuffer;
	var oscillator_playing = false;


	var meter;

	var gain_analyser;

	var memory_pitch = [],
		memory_h0 = [],
		memory_h1 = [],
		memory_h2 = [],
		memory_h3 = [],
		average_pitch,
		memory_volume,
		average_volume,
		isListening = false,
		isReplying = false;

	var bufferLength;
	var dataArray;


	var pitch_buffer_length = 1024;
	var pitch_buffer = new Float32Array( pitch_buffer_length );

	// feedback
	var core_size_multiplier = 16;
	var INTERVAL = {
		UNISON: 0,
		OCTAVE: 1,
		PERFECT_FIFTH: 2,
		PERFECT_FOURTH: 3,
		MAJOR_THIRD: 4,
		NONE: 5,
	};


	// visuals
	var eq_canvas_context;
	var eq_canvas;
	var debug_pitch_label;
	var debug_volume_label;
	var debug_harmonic0_label;
	var debug_harmonic1_label;
	var debug_harmonic2_label;
	var debug_harmonic3_label;
	var debug_harmonic4_label;

	var one_time = false;

	// did not understand
	var DNU_index = 0;

	// Harmony
	var harmony_margin = 0.1;
	var harmonic_threshold = 0.2;


	// UI
	var illy_visible = true;

	/**
	* public
	*/
	var start = function(){
		initVisual();
		initAudio();
		initControls();  	
		IllySynth.init(context); 	
	};

	var initAudio = function(){
		navigator.getUserMedia = (navigator.getUserMedia ||
		          navigator.webkitGetUserMedia ||
		          navigator.mozGetUserMedia ||
		          navigator.msGetUserMedia);

		// set up forked web audio context, for multiple browsers
		// window. is needed otherwise Safari explodes

		context = new (window.AudioContext || window.webkitAudioContext)();
		var stream;		


		//set up the different audio nodes we will use for the app

		analyser = context.createAnalyser();    
		analyser.minDecibels = -90;
		analyser.maxDecibels = -10;
		analyser.smoothingTimeConstant = 0.85;
		analyser.fftSize = 2048;

		meter = createAudioMeter(context);

		gain_analyser = context.createGain();

		//main block for doing the audio recording
		if (navigator.getUserMedia) {
			// console.log('getUserMedia supported.');
			// alert('getUserMedia supported');
			navigator.getUserMedia (
				// constraints - only audio needed for this app
				{
					audio: true
				},

				// Success callback
				function(stream) {
					source = context.createMediaStreamSource(stream);
					source.connect(analyser);
					analyser.connect(gain_analyser);    
					analyser.connect(meter);        

					bufferLength = analyser.frequencyBinCount;
					dataArray = new Float32Array(bufferLength);


					debug_pitch_label = $('#debug-pitch');
					debug_volume_label = $('#debug-volume');
					debug_harmonic0_label = $('#debug-harmonic0');
					debug_harmonic1_label = $('#debug-harmonic1');
					debug_harmonic2_label = $('#debug-harmonic2');
					debug_harmonic3_label = $('#debug-harmonic3');
					debug_harmonic4_label = $('#debug-harmonic4');


					findPitch();
				},

				// Error callback
				function(err) {
					console.log('The following gUM error occured: ' + err);
				}
			);
		} else {
			console.log('getUserMedia not supported on your browser!');
		}    
	};

	// set up visuals
	var initVisual = function(){
		eq_canvas = document.getElementById('eq');
		// $(eq_canvas).hide();
		eq_canvas.width = window.innerWidth;
		eq_canvas.height = window.innerHeight;
		eq_canvas_context = eq_canvas.getContext("2d");
	};

	// set up controls
	var initControls = function(){
		document.addEventListener("keydown", function(event){
			if(event.keyCode == 16 && !oscillator_playing) { //
				//listen
				listen();
			}
		});	

		document.addEventListener("keyup", function(event){
			if(event.keyCode == 16 && oscillator_playing) { //
				reply();
			}
		});

		// document.addEventListener("mousedown", function(event){
		// 	// // alert("mouse down");
		// 	if(!oscillator_playing) { //
		// 		//listen
		// 		listen();
		// 	}
		// });

		// document.addEventListener("mouseup", function(event){
		// 	// alert("mouse up");
		// 	if(!oscillator_playing) { //
		// 		//listen
		// 		reply();
		// 	}
		// });

		// document.getElementById("nav").addEventListener('click', function(){
		// 	// alert("asda");
		// 	if(illy_visible){
		// 		document.getElementById('info-icon').style.display = "none";
		// 		document.getElementById('top-icon').style.display = "block";

		// 		document.getElementById('pi_face').style.display = "none";
		// 		document.getElementById('eq').style.display = "none";
		// 		document.getElementById('status-ready').style.display = "none";
		// 		document.getElementById('status-init').style.display = "none";
		// 		// window.scrollTo(0, window.innerHeight);

		// 		$(document.body).css('overflowY', 'auto');
		// 	}
		// 	else{
		// 		// window.scrollTo(0, 0);	
		// 		document.getElementById('info-icon').style.display = "block";
		// 		document.getElementById('top-icon').style.display = "none";

		// 		document.getElementById('pi_face').style.display = "block";
		// 		document.getElementById('eq').style.display = "block";
		// 		document.getElementById('status-ready').style.display = "block";
		// 		document.getElementById('status-init').style.display = "block";

		// 		$(document.body).css('overflowY', 'hidden');

		// 	}

		// 	illy_visible = !illy_visible;
		// });
	};

	var listen = function(){
		if(Viz.getCurrentState() == Viz.STATE.WAIT){
			memory_pitch = [];
			memory_h0 = [];
			memory_h1 = [];
			memory_h2 = [];
			memory_h3 = [];
			memory_volume = [];
			average_pitch = 0;
			average_volume = 0;
			isListening = true;
			oscillator_playing = true;
			Viz.Listen();
			fadeEQ(1, 200);
		}
		// console.log("am i spamming");
	};

	var reply = function(){
		isListening = false;
		oscillator_playing = false;

		// visualizer
		// var average_volume = 0.8 + 4 * average_volume/memory_volume.length;
		average_volume = average_volume/memory_volume.length;
		if(!average_volume){
			average_volume = 0.5;
		}
		average_pitch = average_pitch/memory_pitch.length;
		// console.log(average_volume);

		Viz.Respond();
		if(memory_pitch[0]){
			checkPitchArray(memory_pitch);
			processRespond();
			// Viz.setCoreSize(average_volume * core_size_multiplier);
			Viz.setCoreSize(convertAverageVolumeToSize(average_volume));
			IllySynth.setMasterVol(convertAverageVolumeToSynthVol(average_volume));
		}
		else{
			// console.log('dnu!!');
			DNU_index = 0;
			// gainNode2.gain.value = 0.5;
			// IllySynth.setVol(0, 0.5);
			// IllySynth.setVol(4, 0.5);
			IllySynth.setMasterVol(0.5);
			processDidNotUnderstand();
		}
		fadeEQ(0, 200);
		// console.log(memory);
	};

	var checkPitchArray = function(in_array){
		// console.log('memory_pitch.length', in_array.length);
		if (in_array.length >= 16 && in_array.length <= 256){
			memory_pitch = in_array;
		}
		else if(in_array.length > 256){
			checkPitchArray(in_array.splice(0, Math.round(in_array.length/2)));
		}
		else if(in_array.length < 16){
			var combined_array = in_array.concat(in_array);
			checkPitchArray(combined_array);
		}
	}

	var resetVisualizer = function(){
		Viz.setCoreMaterialColor("0xff3010");
		Viz.setShellMaterialColor("0x101010");
		Viz.setCoreSize(1);
		Viz.Wait();
	};

	var processDidNotUnderstand = function(){
		var done = false;
		var dnu_frequency
		if(DNU_index < 44){
			dnu_frequency = (440 - DNU_index * 5);			
		}
		else if(DNU_index < 66){
			dnu_frequency = (220 + (DNU_index - 44) * 10);			
		}
		else {
			done = true;
			dnu_frequency = 660;
		}

		IllySynth.setFreq(0, dnu_frequency);
		IllySynth.setFreq(4, dnu_frequency);
		Viz.setCoreSize(dnu_frequency/440);
		DNU_index += 1;

		if(!done){
			if (!window.requestAnimationFrame){
				window.requestAnimationFrame = window.webkitRequestAnimationFrame;
			}
			looper = window.requestAnimationFrame( processDidNotUnderstand );
		} 
		else{
			IllySynth.setFreq(0, 0);
			IllySynth.setFreq(1, 0);
			IllySynth.setFreq(2, 0);
			IllySynth.setFreq(3, 0);
			IllySynth.setFreq(4, 0);

			resetVisualizer();
			fadeEQ(0.6, 400);
		}
	}

	var processRespond = function(time){
		if(memory_pitch.length > 0){

			if(memory_volume[0]){
				// console.log("volume to be set ", memory_volume[0]);
				IllySynth.setMasterVol(memory_volume[0]);

				Viz.setCoreSize(convertAverageVolumeToSize(memory_volume[0]));
			}


			IllySynth.setFreq(0, memory_pitch[0]);
			// oscillator.frequency.value = memory_pitch[0]; 
			if(memory_h1[0]){
				IllySynth.setFreq(1, memory_h1[0]);
				if(memory_h0[0]){
					var harmony = detectHarmony(memory_h0[0], memory_h1[1]);
					var shell_color;
					switch(harmony){
						case 0:
							shell_color = '0x100000';
							break;
						case 1:
							shell_color = '0x001000';
							break;
						case 2:
							shell_color = '0x000010';
							break;
						case 3:
							shell_color = '0x001010';
							break;
						case 4:
							shell_color = '0x100010';
							break;
						case 5:
							shell_color = '0x101000';
							break;
					}
					// console.log(shell_color);
					Viz.setShellMaterialColor(shell_color);
				}
			}

			if(memory_h2[0]){
				IllySynth.setFreq(2, memory_h1[0]);
			}

			if(memory_h3[0]){
				IllySynth.setFreq(3, memory_h1[0]);
			}
			
			Viz.setCoreMaterialColor(pitchToColor(memory_pitch[0]));
			Viz.setOuterRingsSpeed(memory_pitch[0]/4000000);

			memory_pitch.shift();
			memory_h0.shift();
			memory_h1.shift();
			memory_h2.shift();
			memory_h3.shift();
			memory_volume.shift();


		
			if (!window.requestAnimationFrame){
				window.requestAnimationFrame = window.webkitRequestAnimationFrame;
			}
			hello = window.requestAnimationFrame( processRespond );
		}
		else{
			IllySynth.setFreq(0, 0);
			IllySynth.setFreq(1, 0);
			IllySynth.setFreq(2, 0);
			IllySynth.setFreq(3, 0);
			IllySynth.setFreq(4, 0);

			if(Viz.getRepositionState()){
				console.log(Viz.getRepositionState());
				resetVisualizer();	
				fadeEQ(0.6, 400);
			}
			else{
				if (!window.requestAnimationFrame){
					window.requestAnimationFrame = window.webkitRequestAnimationFrame;
				}
				framer = window.requestAnimationFrame( processRespond );
			}
		}
	};

	var error = function () {
		alert('Stream generation failed.');
	};



	var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.

	var autoCorrelate = function ( buf, sampleRate ) {
		var SIZE = buf.length;
		var MAX_SAMPLES = Math.floor(SIZE/2);
		var best_offset = -1;
		var best_correlation = 0;
		var rms = 0;
		var foundGoodCorrelation = false;
		var correlations = new Array(MAX_SAMPLES);

		for (var i=0;i<SIZE;i++) {
			var val = buf[i];
			rms += val*val;
		}
		rms = Math.sqrt(rms/SIZE);
		if (rms<0.01) // not enough signal
			return -1;

		var lastCorrelation=1;
		
		for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
			var correlation = 0;

			for (var i=0; i<MAX_SAMPLES; i++) {
				correlation += Math.abs((buf[i])-(buf[i+offset]));
			}
			correlation = 1 - (correlation/MAX_SAMPLES);
			correlations[offset] = correlation; // store it, for the tweaking we need to do below.
			if ((correlation>0.9) && (correlation > lastCorrelation)) {
				foundGoodCorrelation = true;
				if (correlation > best_correlation) {
					best_correlation = correlation;
					best_offset = offset;
				}
			} else if (foundGoodCorrelation) {
				// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
				// Now we need to tweak the offset - by interpolating between the values to the left and right of the
				// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
				// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
				// (anti-aliased) offset.

				// we know best_offset >=1, 
				// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
				// we can't drop into this clause until the following pass (else if).
				var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
				return sampleRate/(best_offset+(8*shift));
			}
			lastCorrelation = correlation;
		}
		if (best_correlation > 0.01) {
			// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
			return sampleRate/best_offset;
		}
		return -1;
		//  var best_frequency = sampleRate/best_offset;
	};


  
  
	var drawFreq = function(data){
	    eq_canvas_context.clearRect(0, 0, eq_canvas.width, eq_canvas.height);

	    // analyser.getFloatFrequencyData(dataArray);

	    eq_canvas_context.fillStyle = 'rgba(0, 0, 0, 0)';
	    eq_canvas_context.fillRect(0, 0, eq_canvas.width, eq_canvas.height);
	    
	    var barWidth = (eq_canvas.height / bufferLength) * 2.5;
	    var barHeight;
	    var y = 0;


    	var harmonics = {
	      	'amplitude': [-9999, -9999, -9999, -9999, -99999],
	      	'frequency': [-1, -1, -1, -1, -1 ]
    	};

    	for(var i = 0; i < bufferLength; i++) {
    		barHeight = (data[i] + 140)*2;

		    if(isNaN(data[i])){

		    }
	    	else if(data[i] > harmonics.amplitude[0]){
	      		for (var j = harmonics.amplitude.length - 1; j >= 1; j--) {
	        		harmonics.amplitude[j] = harmonics.amplitude[j-1]; 
	        		harmonics.frequency[j] = harmonics.frequency[j-1];
	      		}
		      harmonics.frequency[0] = Math.floor(i * context.sampleRate/analyser.fftSize);
		      harmonics.amplitude[0] = data[i];   
	    	}

		    eq_canvas_context.fillStyle = 'rgba(150,50,50,' + (0.8 + i/400) + ')';
		    eq_canvas_context.fillRect(0,y,barHeight/2,barWidth);
		    eq_canvas_context.fillStyle = 'rgba(50,50,150,' + (0.8 + i/400) + ')';
		    eq_canvas_context.fillRect(eq_canvas.width-barHeight/2,y,barHeight/2,barWidth);

	    	y += barWidth + 1;
	    }

	    if(isListening){
	    	memory_h0.push(Math.round(harmonics.frequency[1]));
			memory_h1.push(Math.round(harmonics.frequency[1]));
			memory_h2.push(Math.round(harmonics.frequency[2]));
			memory_h3.push(Math.round(harmonics.frequency[3]));
		}

		debug_harmonic0_label.text("Possible 0th harmonic frequency: " + Math.round(harmonics.frequency[0]) + " Hz" + " Relation " + detectHarmony(Math.round(harmonics.frequency[0]), Math.round(harmonics.frequency[1])));
	    debug_harmonic1_label.text("Possible 1st harmonic frequency: " + Math.round(harmonics.frequency[1]) + " Hz");
	    debug_harmonic2_label.text("Possible 2nd harmonic frequency: " + Math.round(harmonics.frequency[2]) + " Hz");
	    debug_harmonic3_label.text("Possible 3rd harmonic frequency: " + Math.round(harmonics.frequency[3]) + " Hz");
	    debug_harmonic4_label.text("Possible 4th harmonic frequency: " + Math.round(harmonics.frequency[4]) + " Hz");

	};

	var findPitch = function ( time ) {
		analyser.getFloatTimeDomainData( pitch_buffer );
		analyser.getFloatFrequencyData(dataArray);

		drawFreq(dataArray);

		var pitch = Math.round(autoCorrelate( pitch_buffer, context.sampleRate ));
		debug_pitch_label.text("Detected pitch: " + Math.round(pitch) + " Hz" + " MIDI note is " + Math.round(freqToMIDI(pitch)));
		debug_volume_label.text("Relative volume: " + meter.volume);

		if(isListening){
			if(pitch != -1){
		    	memory_pitch.push(pitch);
		    	average_pitch += pitch;
		    	memory_volume.push(meter.volume);
		    	// console.log('here', pitch);

		    	average_volume += meter.volume;
		  	}
		  	else {
		    	// memory_pitch.push(0);
		  	}
		}

		if (!window.requestAnimationFrame){
		  	window.requestAnimationFrame = window.webkitRequestAnimationFrame;
		}
		rafID = window.requestAnimationFrame( findPitch );
	};

  	var freqToMIDI = function (input_frequency) {

    	var midi_value = 69 + 12 * Math.log2(input_frequency/440);
    	return midi_value;
  	};

	var pitchToColor = function (input_frequency){
		// console.log(input_frequency);
		var color;
		if(Number.isInteger(Math.floor(input_frequency))){
			var rb = (Math.floor(input_frequency)%255).toString(16);
			if( rb < 10){
				rb += "0";
			}
		  	color = "0x" + (rb + "30" + rb);
		}
		else{
		  	color = "0xff3010";
		}
		return color;
	};

	var fadeInEQ = function(){
		$(eq_canvas).animate({
			opacity: 1,
			}, 200, function() {
		// Animation complete.
		});
	};

	var fadeOutEQ = function(){

		$(eq_canvas).animate({
			opacity: 0.5,
			}, 200, function() {
		// Animation complete.
		});
	};

	var fadeEQ = function(opacity, time){
		$(eq_canvas).animate({
			opacity: opacity,
			}, time, function() {
		// Animation complete.
		});
	};

	var detectHarmony = function(freq1, freq2){
		// too exact
		var max_bound = (1 + harmony_margin);
		var min_bound = (1 - harmony_margin);
		// if( freq1 == freq2){
		if( freq1 * max_bound > freq2 && freq1 * min_bound < freq2 ){

			// unison
			return INTERVAL.UNISON;
		}
		// else if(Number.isInteger (freq1/freq2) ){
		else if((freq1 * max_bound > 2 * freq2 && freq1 * min_bound < freq2 * 2) || (freq1 * max_bound * 2 > freq2 && freq1 * min_bound * 2 < freq2)){

			// octave
			return INTERVAL.OCTAVE;
		}
		// else if(Number.isInteger (freq1 * 3/freq2 * 2) ){
		else if(((freq1 * max_bound * 3 ) > (freq2 * 2) && (freq1 * min_bound * 3) < (freq2 * 2)) || ((freq2 * max_bound * 3 ) > (freq1 * 2) && (freq2 * min_bound * 3) < (freq1 * 2))){	
			// perfect 5th
			return INTERVAL.PERFECT_FIFTH;
		}
		// else if(Number.isInteger (freq1 * 4/freq2 * 3) ){
		else if(((freq1 * max_bound * 4 ) > (freq2 * 3) && (freq1 * min_bound * 4) < (freq2 * 3)) || ((freq2 * max_bound * 4) > (freq1 * 3) && (freq2 * min_bound * 4) < (freq1 * 3))){	
			// perfect 4th
			return INTERVAL.PERFECT_FOURTH;
		}
		// else if(Number.isInteger (freq1 * 5/freq2 * 4) ){
		else if(((freq1 * max_bound * 5 ) > (freq2 * 4) && (freq1 * min_bound * 5) < (freq2 * 4)) || ((freq2 * max_bound * 5) > (freq1 * 4) && (freq2 * min_bound * 5) < (freq1 * 4))){	
			// major 3rd
			return INTERVAL.MAJOR_THIRD;
		}
		else{
			return INTERVAL.NONE;
		}
	};

	var convertAverageVolumeToSynthVol = function(input){
		var output;
		if (input <= 0.2){
			output = 0.2;
		}
		else if (( 0.2 < input) && (input <= 0.9)){
			output = input;
		}
		else{
			output = 1;
		}

		return output;
	};

	var convertAverageVolumeToSize = function(input){
		var output;
		if (input <= 0.1){
			output = 0.5;
		}
		else if (( 0.1 < input  && input <= 0.3)){
			output = 0.5 + (input - 0.1) * 2;
		}
		else if (( 0.3 < input && input <= 0.9)){
			output = 0.9 + (input - 0.3);
		}
		else {
			output = 1.4;
		}

		// console.log(input, output);
		return output;
	};

	var externalListen = function(){
		if(!oscillator_playing) { 
			listen();
		}
	};

	var externalReply = function(){
		if(oscillator_playing) {
			//listen
			reply();
		}
	};


	return {
		start: start,
		externalListen: externalListen,
		externalReply: externalReply,
	}

}();


