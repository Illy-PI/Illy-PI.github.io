var Viz = function(){
	// TODO: post processing: https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_dynamic.html
	// threejs stuff
	var scene;
	var renderer;

	// constants
	var FOV = 45;						// degrees
	var MINIMUM_DISTANCE = 0.1; 		// in meters
	var MAXIMUM_DISTANCE = 1600;
	var STATE = {
		WAIT : 0,
		LISTEN: 1,
		RESPOND: 2,
		OPEN: 3
	};
	var DEFAULT_CORE_SPEED = - 0.0001;
	var DEFAULT_OUTER_RINGS_SPEED = 0.0004;

	var VR_CAMERA_MOVEMENT_SPEED_MULTIPLIER = 0.5;
	var CAMERA_MOVEMENT_SPEED = 0.05 * VR_CAMERA_MOVEMENT_SPEED_MULTIPLIER;

	var SIZE_MULTIPLIER = 0.5;
	var LOCATION_MULTIPLIER = 2;
	var VIVE_SCALE = 0.6;

	var scene_width = window.innerWidth;
	var scene_height = window.innerHeight;


	// variables
	var outer_rings_speed = DEFAULT_OUTER_RINGS_SPEED;
	var point_cloud_speed = -0.0003;
	var shell_speed = 0.0001;
	var core_speed = DEFAULT_CORE_SPEED;

	// objects
	var perspective_camera;
	var core;					// core
	var shell;					// shell
	var outer_rings;			// outer rings
	var outer_rings_v2;			// outer rings with opacity
	var point_cloud;			// cloud

	// geometries
	var sphere_geometry;
	var sphere_geometry_v2;
	var shell_geometry;
	var core_geometry;
	var point_cloud_geometry;

	// materials
	var sphere_material;
	var sphere_material_v2;
	var core_material;
	var shell_material;
	var point_cloud_material;

	// opening values
	var opening_sub_state = 0;
	var core_opening_size_target = 1;
	var core_opening_size_current = 0;
	var core_vertices_index = 0;
	var shell_opening_opacity_current = 0;
	var shell_opening_opacity_target = 1;
	var opening_time = 0;
	var outer_rings_opacity_current = 0;
	var outer_rings_opacity_target = 1;
	var outer_rings_vertices = [];
	var outer_rings_vertices_counter = 0;
	var opening_wait_time_current = 0;
	var opening_wait_time_target = 30;

	// flags
	var reverse_action = true;

	var pingpong_states = [true, true, true, true, true, true];

	var current_state = STATE.OPEN;
	var camera_angle = {
		current: {
			x: Math.PI/2,
			y: Math.PI/2,
			z: 0
		},
		default:{
			x: Math.PI/2,
			y: Math.PI/2,
			z: 0
		},
		listening:{
			x: Math.PI/2,
			y: Math.PI/2,
			z: 0
		}
	};

	if(reverse_action){
		camera_angle = {
			current: {
				x: Math.PI/2,
				y: Math.PI/2,
				z: Math.PI
			},
			default:{
				x: Math.PI/2,
				y: Math.PI/2,
				z: Math.PI
			},
			listening:{
				x: Math.PI/2,
				y: Math.PI/2,
				z: Math.PI
			}
		};
	}


	var PingPong = function(input, delta, min, max, state){
		if(state){
			if(input >= max){
				state = false;
				input -= delta;
			}
			else{
				input += delta;
			}
		}
		else{
			if(input <= min){
				state = true;
				input += delta;
			}
			else{
				input -= delta;
			}
		}	

		return {
			value : input,
			state : state
		};
	};


	var reposition_x = false;
	var reposition_y = false;
	var reposition_z = false;
	var reposition = true;

	// VR
	var controls;
	var effect;
	// Vive
	var controller1, controller2;
	var room;

	var onWindowResize = function() {
		perspective_camera.aspect = window.innerWidth / window.innerHeight;
		perspective_camera.updateProjectionMatrix();
		
		effect.setSize( window.innerWidth, window.innerHeight );
	}
	
	var init = function(){
		// alert(scene_width + " " + scene_height);
		var scene = new THREE.Scene();
		var renderer = new THREE.WebGLRenderer( {antialias: true});

		

		document.getElementById("pi_face").appendChild(renderer.domElement);

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize(scene_width, scene_height);



		// camera
		perspective_camera = new THREE.PerspectiveCamera(FOV, scene_width/scene_height, MINIMUM_DISTANCE, MAXIMUM_DISTANCE);
		
		if(reverse_action){
			perspective_camera.position.z = 0;
			perspective_camera.position.y = 0;
			perspective_camera.position.x = 0;
			perspective_camera.lookAt(new THREE.Vector3(0,0,0));
		}
		else{
			perspective_camera.position.z = LOCATION_MULTIPLIER * Math.cos(camera_angle.default.z);
			perspective_camera.position.y = LOCATION_MULTIPLIER * Math.cos(camera_angle.default.y);
			perspective_camera.position.x = LOCATION_MULTIPLIER * Math.cos(camera_angle.default.x);
			perspective_camera.lookAt(new THREE.Vector3(0,0,0));
		}

		controls = new THREE.VRControls( perspective_camera );
        effect = new THREE.VREffect( renderer );

        // Vive Controls
        // controllers
		controller1 = new THREE.ViveController( 0 );
		controller1.standingMatrix = controls.getStandingMatrix();
		scene.add( controller1 );
		controller2 = new THREE.ViveController( 1 );
		controller2.standingMatrix = controls.getStandingMatrix();
		scene.add( controller2 );
		var loader = new THREE.OBJLoader();
		loader.setPath( 'models/obj/vive-controller/' );
		loader.load( 'vr_controller_vive_1_5.obj', function ( object ) {
			var loader = new THREE.TextureLoader();
			loader.setPath( 'models/obj/vive-controller/' );
			var controller = object.children[ 0 ];
			controller.material.map = loader.load( 'onepointfive_texture.png' );
			controller.material.specularMap = loader.load( 'onepointfive_spec.png' );
			controller1.add( object.clone() );
			controller2.add( object.clone() );
		} );

		controller1.addEventListener( 'triggerdown', onViveTriggerDown );
		controller1.addEventListener( 'triggerup', onViveTriggerUp );

		controller2.addEventListener( 'triggerdown', onViveTriggerDown );
		controller2.addEventListener( 'triggerup', onViveTriggerUp );

		if ( WEBVR.isAvailable() === false ) {
            document.body.appendChild( WEBVR.getMessage() );
        }
        else{        	
            document.body.appendChild( WEBVR.getButton(effect) );   
        }

        window.addEventListener( 'resize', onWindowResize, false );

		// geometries
		sphere_geometry = new THREE.SphereGeometry( 1 * SIZE_MULTIPLIER, 16, 16, 0, Math.PI*2*15/16, 0, Math.PI*2*15/16 );		

		point_cloud_geometry = new THREE.Geometry();
		for (var i = 0; i < 1000; i++){
			point_cloud_geometry.vertices.push(new THREE.Vector3(
				(Math.random() -0.5) * SIZE_MULTIPLIER,
				(Math.random() -0.5) * SIZE_MULTIPLIER,
				(Math.random() -0.5) * SIZE_MULTIPLIER
			));
		};

		shell_geometry = new THREE.SphereGeometry(1 * SIZE_MULTIPLIER, 40, 20, 0, Math.PI*2, Math.PI/4, Math.PI/2);
		shell_geometry.vertices.forEach(function(v){
			v.multiplyScalar(Math.random());
		});

		core_geometry = new THREE.SphereGeometry(0.2 * SIZE_MULTIPLIER, 16, 16);//, 0, Math.PI*2, Math.PI/4, Math.PI/2);
		// core_geometry.vertices.forEach(function(v){
		// 	v.multiplyScalar(Math.random());
		// });

		// materials
		mesh_material = new THREE.MeshBasicMaterial( {color: 0xffff00, wireframe: true} );

		var particle_texture = new THREE.TextureLoader().load('../vr/assets/images/particle3.png');
		sphere_material = new THREE.PointsMaterial( {
			color: 0x102040, 
			size: 0.6 * SIZE_MULTIPLIER, 
			blending: THREE.AdditiveBlending, 
			depthWrite: false, 
			transparent: true,
			map: particle_texture
		});

		point_cloud_material = new THREE.PointsMaterial( {
			color: 0xf0f0f0, 
			size: 0.05 * SIZE_MULTIPLIER, 
			blending: THREE.AdditiveBlending, 
			depthWrite: false, 
			transparent: true,
			map: particle_texture
		});
		var shell_material = new THREE.MeshBasicMaterial({
			color: 0x101010, 
			// size: 0.1 * SIZE_MULTIPLIER, 
			blending: THREE.AdditiveBlending, 
			depthWrite: false, 
			transparent: true,
		});
		var iris_texture = new THREE.TextureLoader().load('../vr/assets/images/iris.png');
		core_material = new THREE.MeshBasicMaterial({
			map: iris_texture,
			color: 0xff3010, 
			// size: 0.5 * SIZE_MULTIPLIER, 
			blending: THREE.AdditiveBlending, 
			depthWrite: false, 
			transparent: true,
			// wireframe: true
		});

		// objects
		core = new THREE.Mesh (core_geometry, core_material);
		shell = new THREE.Mesh (shell_geometry, shell_material);
		outer_rings = new THREE.Points( sphere_geometry, sphere_material);
		point_cloud = new THREE.Points(point_cloud_geometry, point_cloud_material);


		// Setting up for opening animation
		core.scale.set(core_opening_size_current, core_opening_size_current, core_opening_size_current);	
		core.rotation.y = -Math.PI/2;
		core.position.z = -3;
		scene.add(core);
		outer_rings.material.opacity = 0;
		outer_rings_vertices = JSON.parse(JSON.stringify(outer_rings.geometry.vertices));
		for (var i = outer_rings.geometry.vertices.length - 1; i >= 0; i--) {
			outer_rings.geometry.vertices[i].y = 0;
		}
		outer_rings.geometry.verticesNeedUpdate = true;
		// outer_rings.position.z = -3;
		scene.add(outer_rings );
		shell.material.opacity = 0;
		// shell.position.z = -3;
		scene.add(shell);
		point_cloud.material.opacity = 0;
		// point_cloud.position.z = -3;
		scene.add(point_cloud);

		// Add a repeating grid as a skybox.
		// var boxSize = LOCATION_MULTIPLIER * 2;
		// var loader = new THREE.TextureLoader();
		// loader.load('../assets/images/iris.png', onTextureLoaded);
		// function onTextureLoaded(texture) {
		// 	texture.wrapS = THREE.RepeatWrapping;
		// 	texture.wrapT = THREE.RepeatWrapping;
		// 	texture.repeat.set(boxSize, boxSize);
		// 	var geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
		// 	var material = new THREE.MeshBasicMaterial({
		// 		map: texture,
		// 		color: 0x01BE00,
		// 		side: THREE.BackSide
		// 	});
		// 	// Align the skybox to the floor (which is at y=0).
		// 	room = new THREE.Mesh(geometry, material);
		// 	room.position.y = boxSize/2;
		// 	scene.add(room);
		// 	// For high end VR devices like Vive and Oculus, take into account the stage
		// 	// parameters provided.
		// 	// setupStage();
		// }

		var room_texture =new THREE.TextureLoader().load( "../vr/assets/images/bg.png" );
		room_texture.wrapS = THREE.RepeatWrapping;
		room_texture.wrapT = THREE.RepeatWrapping;
		room_texture.repeat.set( 2 * LOCATION_MULTIPLIER, 2 * LOCATION_MULTIPLIER );


		room = new THREE.Mesh(
			new THREE.BoxGeometry( 5 * LOCATION_MULTIPLIER, 5 * LOCATION_MULTIPLIER, 5 * LOCATION_MULTIPLIER ),
			new THREE.MeshBasicMaterial({
				map: room_texture,
				side: THREE.BackSide
			})
			// new THREE.BoxGeometry( 6, 6, 6, 8, 8, 8 ),
			// 		new THREE.MeshBasicMaterial( { color: 0x404040, wireframe: true } )	
		);
		room.position.y = LOCATION_MULTIPLIER;
		scene.add( room );

		if(reverse_action){
			moveIlly(LOCATION_MULTIPLIER * Math.cos(camera_angle.current.x), LOCATION_MULTIPLIER * Math.cos(camera_angle.current.y), LOCATION_MULTIPLIER * Math.cos(camera_angle.current.z));
		}

		// var controls = new THREE.OrbitControls(perspective_camera, renderer.domElement);
	
		function update(timeDelta){
			// console.log(timeDelta);
			if(current_state == STATE.WAIT){
				defaultAction(timeDelta-opening_time);
				// defaultAction(timeDelta);
			}
			else if(current_state == STATE.LISTEN){
				// console.log('listen move');
				defaultAction(timeDelta-opening_time);
				// defaultAction(timeDelta);
				// move camera to eye
				if(Math.abs(camera_angle.current.y - camera_angle.listening.y) > CAMERA_MOVEMENT_SPEED){
					if(camera_angle.current.y > camera_angle.listening.y){
						camera_angle.current.y -= CAMERA_MOVEMENT_SPEED;
					}
					else{
						camera_angle.current.y += CAMERA_MOVEMENT_SPEED;
					}
				}
				else{
					camera_angle.current.y = camera_angle.listening.y;					
				}

				if(Math.abs(camera_angle.current.z - camera_angle.listening.z) > CAMERA_MOVEMENT_SPEED){
					if(camera_angle.current.z > camera_angle.listening.z){
						camera_angle.current.z -= CAMERA_MOVEMENT_SPEED;
					}
					else{
						camera_angle.current.z += CAMERA_MOVEMENT_SPEED;
					}
				}
				else{
					camera_angle.current.z = camera_angle.listening.z;					
				}

				if(Math.abs(camera_angle.current.x - camera_angle.listening.x) > CAMERA_MOVEMENT_SPEED){
					if(camera_angle.current.x > camera_angle.listening.x){
						camera_angle.current.x -= CAMERA_MOVEMENT_SPEED;
					}
					else{
						camera_angle.current.x += CAMERA_MOVEMENT_SPEED;
					}
				}
				else{
					camera_angle.current.x = camera_angle.listening.x;
				}

				if(reverse_action){
					moveIlly(LOCATION_MULTIPLIER * Math.cos(camera_angle.current.x), LOCATION_MULTIPLIER * Math.cos(camera_angle.current.y), LOCATION_MULTIPLIER * Math.cos(camera_angle.current.z));
				}
				else{
					perspective_camera.position.x = LOCATION_MULTIPLIER * Math.cos(camera_angle.current.x);
					perspective_camera.position.z = LOCATION_MULTIPLIER * Math.cos(camera_angle.current.z);
					perspective_camera.position.y = LOCATION_MULTIPLIER * Math.cos(camera_angle.current.y);
					perspective_camera.lookAt(new THREE.Vector3(0,0,0));	
				}	
			}
			else if(current_state == STATE.RESPOND){
				// move camera to default
				// console.log('respond move');
				if(Math.abs(camera_angle.current.y - camera_angle.default.y) > CAMERA_MOVEMENT_SPEED){
					if(camera_angle.current.y > camera_angle.default.y){
						camera_angle.current.y -= CAMERA_MOVEMENT_SPEED;
					}
					else{
						camera_angle.current.y += CAMERA_MOVEMENT_SPEED;
					}
				}
				else{
					if(!reposition_y){
						console.log('y done');
						reposition_y = true;
					}
					camera_angle.current.y = camera_angle.default.y;					
				}

				if(Math.abs(camera_angle.current.z - camera_angle.default.z) > CAMERA_MOVEMENT_SPEED){
					if(camera_angle.current.z > camera_angle.default.z){
						camera_angle.current.z -= CAMERA_MOVEMENT_SPEED;
					}
					else{
						camera_angle.current.z += CAMERA_MOVEMENT_SPEED;
					}
				}
				else{
					if(!reposition_z){
						console.log('z done');
						reposition_z = true;
					}
					camera_angle.current.z = camera_angle.default.z;
				}

				if(Math.abs(camera_angle.current.x - camera_angle.default.x) > CAMERA_MOVEMENT_SPEED){
					if(camera_angle.current.x > camera_angle.default.x){
						camera_angle.current.x -= CAMERA_MOVEMENT_SPEED;
					}
					else{
						camera_angle.current.x += CAMERA_MOVEMENT_SPEED;
					}
				}
				else{
					if(!reposition_x){
						console.log('x done');
						reposition_x = true;
					}
					camera_angle.current.x = camera_angle.default.x;
				}

				if(reposition_x && reposition_y && reposition_z){
					reposition = true;
				}

				if(reverse_action){
					moveIlly(LOCATION_MULTIPLIER * Math.cos(camera_angle.current.x), LOCATION_MULTIPLIER * Math.cos(camera_angle.current.y), LOCATION_MULTIPLIER * Math.cos(camera_angle.current.z));
				}
				else{
					perspective_camera.position.x = LOCATION_MULTIPLIER * Math.cos(camera_angle.current.x);
					perspective_camera.position.z = LOCATION_MULTIPLIER * Math.cos(camera_angle.current.z);
					perspective_camera.position.y = LOCATION_MULTIPLIER * Math.cos(camera_angle.current.y);
					perspective_camera.lookAt(new THREE.Vector3(0,0,0));	
				}	

				defaultAction(timeDelta-opening_time);
			}
			else if(current_state == STATE.OPEN){
				openingAction(timeDelta);
			}
			
			// renderer.render(scene, perspective_camera);
			effect.requestAnimationFrame(update);

			controls.update();
			controller1.update();
			controller2.update();
			effect.render( scene, perspective_camera );
		}

		update();
		
	};

	var openingAction = function(timeDelta){
	// var openingAction = function(){

		switch(opening_sub_state){
			case 0: 		
				IllySynth.setFreq(4, 220 * (core_opening_size_current/core_opening_size_target));		
				if(core_opening_size_target > core_opening_size_current){
					core.scale.set(core_opening_size_current, core_opening_size_current, core_opening_size_current);	
					core_opening_size_current += 0.02;					
				}
				else{
					opening_sub_state = 1;
				}
				break;

			case 1:
				IllySynth.setFreq(4, 0);
				// IllySynth.setFreq(0, Math.floor(Math.random() * (660 - 440)) + 440);
				var wavelength = 50;
				var beat1_end = 4;
				var beat2_start = 15;
				var beat2_end = 19;

				if(core_vertices_index%wavelength < beat1_end || ( core_vertices_index%wavelength < beat2_end && core_vertices_index%wavelength > beat2_start)){
					IllySynth.setFreq(3, 220);
				}
				else{
					IllySynth.setFreq(3, 0);
				}
				if(core_vertices_index < core.geometry.vertices.length){
					// core_geometry.vertices.forEach(function(v){
					// 	v.multiplyScalar(Math.random());
					// });
					core.geometry.vertices[core_vertices_index].multiplyScalar(Math.random());
					core.geometry.verticesNeedUpdate = true;
					core_vertices_index++;
				}
				else{
					opening_sub_state = 2;
				}	
				break

			case 2:
				IllySynth.setFreq(3, 0);
				IllySynth.setFreq(4, 0);
				IllySynth.setFreq(2, 220 + 220 * (shell_opening_opacity_current / shell_opening_opacity_target ));
				if(shell_opening_opacity_target > shell_opening_opacity_current){					
					shell.material.opacity = shell_opening_opacity_current;
					shell_opening_opacity_current += 0.04;
				}
				else{
					opening_sub_state = 3;
				}
				break;

			case 3:
				IllySynth.setFreq(2, 0);
				// console.log(outer_rings.geometry);
				if(outer_rings_opacity_target > outer_rings_opacity_current){					
					outer_rings.material.opacity = outer_rings_opacity_current;
					outer_rings_opacity_current += 0.05;			
				}
				else{
					opening_sub_state = 4;
				}
				break;

			case 4:
			IllySynth.setFreq(1, 440 + 440 * ( outer_rings_vertices_counter/outer_rings_vertices.length));
				// if( outer_rings_vertices_counter%== 0){
				// 	// IllySynth.setFreq(3, Math.floor(Math.random() * (880 - 440)) + 440);
				// 	IllySynth.setFreq(1, 440 + 440 * ( outer_rings_vertices_counter/outer_rings_vertices.length));
				// }
				// else{
				// 	IllySynth.setFreq(1, 0);
				// }
				// IllySynth.setFreq(0, Math.floor(Math.random() * (880 - 440)) + 440);
				// console.log(outer_rings_vertices[0]);
				// current_state = STATE.WAIT;
				if(outer_rings_vertices_counter < outer_rings_vertices.length){
					outer_rings.geometry.vertices[outer_rings_vertices_counter].y = outer_rings_vertices[outer_rings_vertices_counter].y;
					outer_rings.geometry.verticesNeedUpdate = true;
					outer_rings_vertices_counter++;					
				}
				else{
					opening_sub_state = 5;
				}
				break;
			case 5:		
				IllySynth.setFreq(1, 880);
				IllySynth.setFreq(0, 880);		
				if(point_cloud.material.opacity < 1){
						point_cloud.material.opacity += 0.05;
					}
				else{
					opening_sub_state = 6;
				}
				break;


			// initialize waveforms

			case 6:				

				IllySynth.setFreq(0, 880);		
				if(opening_wait_time_current < opening_wait_time_target){
					opening_wait_time_current++;
				}
				else{
					IllySynth.setFreq(0, 0);	
					IllySynth.setFreq(1, 0);	
					$('#status-init').animate({
						opacity: 0,
						}, 200, function() {
					});
					$('#status-ready').animate({
						opacity: 1,
						}, 200, function() {
							setTimeout(function(){
								$('#status-ready').animate({
									opacity: 0,
									}, 1000, function() {
								});
							}, 2000);
					});
					
					current_state = STATE.WAIT;
					opening_time = timeDelta;
				}
				break;
		}		
		
	};

	var defaultAction = function(timeDelta){
		// console.log('outer_rings_speed', outer_rings_speed);
		// console.log('point_cloud_speed', point_cloud_speed);
		// console.log('shell_speed', shell_speed);
		// console.log('core_speed', core_speed);
		// movement
		outer_rings.rotation.y = timeDelta * outer_rings_speed;
		point_cloud.rotation.y = timeDelta * point_cloud_speed;
		point_cloud.rotation.z = timeDelta * point_cloud_speed;
		shell.rotation.x = timeDelta * shell_speed;
		core.rotation.x = timeDelta * core_speed;

		// color
		var pp_color = PingPong(outer_rings.material.color.b, 0.005, 0, 1, pingpong_states[0]);
		outer_rings.material.color.b = pp_color.value;
		pingpong_states[0] = pp_color.state;

		pp_color = PingPong(outer_rings.material.color.g, 0.001, 0, 1, pingpong_states[1]);
		outer_rings.material.color.g = pp_color.value;
		pingpong_states[1] = pp_color.state;

		// size
		if(current_state != STATE.LISTEN){
			// console.log('changing the size of the core');
			pp_scale_x = PingPong(core.scale.x, 0.002, 0.7, 1.5, pingpong_states[2]);
			pp_scale_y = PingPong(core.scale.y, 0.002, 0.7, 1.5, pingpong_states[3]);
			pp_scale_z = PingPong(core.scale.z, 0.002, 0.7, 1.5, pingpong_states[4]);

			pingpong_states[2] = pp_scale_x.state;
			pingpong_states[3] = pp_scale_y.state;
			pingpong_states[4] = pp_scale_z.state;

			core.scale.set(pp_scale_x.value, pp_scale_y.value, pp_scale_z.value);
		}


		pp_particle_size = PingPong(outer_rings.material.size, 0.001 * VIVE_SCALE, 0, 0.8 * SIZE_MULTIPLIER * VIVE_SCALE, pingpong_states[5]);
		pingpong_states[5] = pp_particle_size.state;
		outer_rings.material.size = pp_particle_size.value;
	}

	var setOuterRingsSpeed = function (new_speed){
		outer_rings_speed = new_speed;
	};

	var setPointCloudSpeed = function (new_speed){
		point_cloud_speed = new_speed;
	};

	var setLineMashSpeed = function (new_speed){
		shell_speed = new_speed;
	};

	var setCoreSpeed = function (new_speed){
		core_speed = new_speed;
	};

	var Open = function(){

	};

	var Wait = function(){
		current_state = STATE.WAIT;
		setOuterRingsSpeed(DEFAULT_OUTER_RINGS_SPEED);
	};

	var Listen = function (){
		current_state = STATE.LISTEN;		
		camera_angle.listening.x = Math.random() * 2 * Math.PI - Math.PI;
		camera_angle.listening.y = Math.random() * 2 * Math.PI - Math.PI;
		camera_angle.listening.z = Math.random() * 2 * Math.PI - Math.PI;

		// console.log("----------");
		// console.log(camera_angle.listening.x * (360/(Math.PI*2)));
		// console.log('vs');
		// console.log(camera_angle.default.x * (360/(Math.PI*2)));

		// console.log(camera_angle.listening.y * (360/(Math.PI*2)));
		// console.log('vs');
		// console.log(camera_angle.default.y * (360/(Math.PI*2)));

		// console.log(camera_angle.listening.z * (360/(Math.PI*2)));
		// console.log('vs');
		// console.log(camera_angle.default.z * (360/(Math.PI*2)));
		// console.log("----------");
	};

	var Respond = function(){
		current_state = STATE.RESPOND;
		reposition_x = false;
		reposition_y = false;
		reposition_z = false;
		reposition = false;
	};

	var setCoreMaterialColor = function(new_color){
		core.material.color.setHex(new_color);
	};

	var setCoreSize = function(new_size){
		// core.scale.x = new_size;
		// core.scale.y = new_size;
		// core.scale.z = new_size;
		new_size *= SIZE_MULTIPLIER;
		core.scale.set(new_size, new_size, new_size);
	};

	var setShellMaterialColor = function(new_color){
		shell.material.color.setHex(new_color);
	};

	var getCurrentState = function(){
		return current_state;
	};

	var getRepositionState = function(){
		return reposition;
	};

	var moveIlly = function(x,y,z){
		core.position.x = x;
		core.position.y = y;
		core.position.z = z;

		shell.position.x = x;
		shell.position.y = y;
		shell.position.z = z;

		point_cloud.position.x = x;
		point_cloud.position.y = y;
		point_cloud.position.z = z;

		outer_rings.position.x = x;
		outer_rings.position.y = y;
		outer_rings.position.z = z;
	};

	var onViveTriggerUp = function(){
		// console.log("This is up");
		IllyAudio.externalReply();
	};

	var onViveTriggerDown = function(){
		// console.log("This is down");
		IllyAudio.externalListen();
	};

	// for quick debug for VR
	var setLocationMultiplier = function(new_multiplier){
		LOCATION_MULTIPLIER = new_multiplier;
	};

	var setGlobalScale = function(new_scale){
		SIZE_MULTIPLIER = new_scale;
	};

	// public methods
	return{
		init: init,
		setOuterRingsSpeed: setOuterRingsSpeed,
		setPointCloudSpeed: setPointCloudSpeed,
		setLineMashSpeed: setLineMashSpeed,
		setCoreSpeed: setCoreSpeed,
		setCoreMaterialColor: setCoreMaterialColor,
		setCoreSize: setCoreSize,
		setShellMaterialColor: setShellMaterialColor,
		Wait: Wait,
		Listen: Listen,
		Respond: Respond,
		getCurrentState: getCurrentState,
		STATE: STATE,
		getRepositionState: getRepositionState,
		setLocationMultiplier: setLocationMultiplier,
		setGlobalScale: setGlobalScale
	}
}();
