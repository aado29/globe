var Globe = function(container, list) {

	this.camera = null;
	this.glRenderer = null;
	this.cssScene = null;
	this.glScene = null;
	this.globeGroup = null;
	this.nodeGroup = null;
	this.cssRenderer = null;
	this.particleGroup = [];

	this.container = document.getElementById(container);

	this.mouseX = 0;
	this.mouseY = 0;
	this.windowHalfX = window.innerWidth / 2;
	this.windowHalfY = window.innerHeight / 2;
	this.globeRadius = 200;

	this.raycaster = new THREE.Raycaster();
	this.mouse = new THREE.Vector2();

	this.list = ( typeof(list) == 'object' || typeof(list) == 'array') ? list: [];
	this.particleGroup = [];

	this.init;

	this.init = function() {

		// create camera object
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );

		// set camera perspective
		this.camera.position.z = 500;

		// create GlRenderer and CssRenderer
		this.glRenderer = this.createGlRenderer();
		this.cssRenderer = this.createCssRenderer();

		// render components in selected container from constructor
		this.container.appendChild(this.cssRenderer.domElement);
		this.cssRenderer.domElement.appendChild(this.glRenderer.domElement);

		// create the scenes to show
		this.glScene = new THREE.Scene();
		this.cssScene = new THREE.Scene();

		// set light for the GlRenderer
		var light = this.createLight()
		this.glScene.add( light );

		// add events in the DOM

		// by particle
		this.glRenderer.domElement.addEventListener('click', this.handleClickParticle.bind(this), false);
		this.glRenderer.domElement.addEventListener('mousemove', this.handleHoverParticle.bind(this), false);

		// by window
		window.addEventListener( 'click', this.onWindowClick.bind(this) );
		window.addEventListener( 'resize', this.onWindowResize.bind(this) );

		this.addStuff();
		this.render();

	}

	this.createShadow = function() {

		var canvas = document.createElement( 'canvas' );
		canvas.width = 128;
		canvas.height = 128;

		var context = canvas.getContext( '2d' );
		var gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );
		gradient.addColorStop( 0.1, 'rgba(210,210,210,1)' );
		gradient.addColorStop( 1, 'rgba(255,255,255,1)' );

		context.fillStyle = gradient;
		//context.fillStyle = '#000000';
		context.fillRect( 0, 0, canvas.width, canvas.height );

		var shadowTexture = new THREE.Texture( canvas );
		shadowTexture.needsUpdate = true;

		var shadowMaterial = new THREE.MeshBasicMaterial( { map: shadowTexture } );
		var shadowGeo = new THREE.PlaneBufferGeometry( 300, 300, 1, 1 );
		var mesh = new THREE.Mesh( shadowGeo, shadowMaterial );

		return mesh;

	}

	this.createLight = function() {

		var light = new THREE.PointLight( 0xffffff, 1.5 );
		light.position.set( 1000, 1000, 2000 );

		return light;

	}

	this.createGlRenderer = function() {

		var glRenderer = new THREE.WebGLRenderer({alpha:true, antialias: true});
		glRenderer.setClearColor(0xffffff);
		glRenderer.setPixelRatio(window.devicePixelRatio);
		glRenderer.setSize(window.innerWidth, window.innerHeight);
		glRenderer.domElement.style.position = 'absolute';
		glRenderer.domElement.style.zIndex = 1;
		glRenderer.domElement.style.top = 0;

		return glRenderer;

	}

	this.createCssRenderer = function() {

		var cssRenderer = new THREE.CSS3DRenderer();
		cssRenderer.setSize(window.innerWidth, window.innerHeight);
		cssRenderer.domElement.style.position = 'absolute';
		this.glRenderer.domElement.style.zIndex = 0;
		cssRenderer.domElement.style.top = 0;

		return cssRenderer;
	
	}

	this.addStuff = function() {

		this.drawBackgroundglobe(); //glScene
		this.drawGlobe();
		this.drawList();

	}

	this.drawBackgroundglobe = function() {

		var self = this;
		var loader = new THREE.TextureLoader();
		loader.load('globe.png', function ( image ) {
			var bg = new THREE.Mesh( 
				new THREE.PlaneGeometry(self.globeRadius * 2.2, self.globeRadius * 2.2),
				new THREE.MeshBasicMaterial( {
					map: image,
					transparent: true,
					opacity: 1,
					color: 0xCCCCCC
				} )
			);
			bg.name = 'Background Image';
			self.glScene.add(bg);
		} );

	}

	this.createGlobeTexture = function() {

		var canvas, size = 256;

		// create canvas
		canvas = document.createElement( 'canvas' );
		canvas.width = size;
		canvas.height = size;

		// get context
		var context = canvas.getContext( '2d' );

		// draw gradient
		context.rect( 0, 0, size, size );
		var gradient = context.createLinearGradient( 0, 0, size, size );
		gradient.addColorStop(0.2, '#1f9ae5'); // blue light 
		gradient.addColorStop(1, '#1ec480'); // green
		context.fillStyle = gradient;
		context.fill();

		var texture = new THREE.Texture( canvas );
		texture.needsUpdate = true;

		return texture;

	}

	this.drawGlobe = function() {

		this.globeGroup = new THREE.Group();
		this.globeGroup.name = 'Globe Group';
		this.glScene.add( this.globeGroup );

		var geometry = new THREE.IcosahedronGeometry( this.globeRadius, 1 );

		// scale geometry to a uniform size
		geometry.computeBoundingSphere();

		var scaleFactor = 160 / geometry.boundingSphere.radius;
		geometry.scale( scaleFactor, scaleFactor, scaleFactor );

		// in case of duplicated vertices
		geometry.mergeVertices();
		geometry.computeFaceNormals();
		geometry.computeVertexNormals( true );

		var material = new THREE.MeshBasicMaterial( {
			map: this.createGlobeTexture(),
			transparent: true,
			wireframe: true,
			wireframeLinewidth: 2,
			opacity: 1,
		} );

		var mesh = new THREE.Mesh( geometry, material );

		mesh.name = 'Globe 3D';
		this.globeGroup.add( mesh );

		var shadow = this.createShadow();
		shadow.name = 'Globe Shadow';
		shadow.position.y = - (this.globeRadius + 50);
		shadow.rotation.x = - Math.PI / 1.6;
		this.glScene.add( shadow );

		for (var i = 0; i < mesh.geometry.vertices.length; i++) {
			var coor = mesh.geometry.vertices[i];

			var particle = new THREE.Mesh( 
				new THREE.SphereGeometry( 5, 32, 32 ),
				new THREE.MeshBasicMaterial( {
					opacity: 1, 
					map: this.createGlobeTexture(),
					transparent: true
				} ) 
			);
			particle.name = 'Globe particle ' + i;
			particle.position.set( coor.x, coor.y, coor.z);
			
			this.globeGroup.add( particle );
		}

	}

	this.drawList = function() {

		this.nodeGroup = new THREE.Group();
		this.nodeGroup.name = 'Particles Group';
		this.glScene.add( this.nodeGroup );

		var material = new THREE.LineBasicMaterial({
			color: 0xCCCCCC,
			linewidth: 1.5
		});

		for (var i = 0; i < this.list.length; i++) {

			//{data: data, type: type, geometry: geometry}
			var currentList = this.list[i];
			var dataList = currentList.data;

			if (dataList.length > 0) {
				var listType = currentList.type;
				var skullList = new THREE.Geometry();

				for (var j = 0; j < currentList.data.length; j++) {
					var currentNode = dataList[j];
					var group = new THREE.Group();
					group.name = 'list ' + listType + ' - particle ' + (j + 1);

					// draw the skull of current list
					skullList.vertices.push(
						new THREE.Vector3(currentNode.x, currentNode.y, 0)
					);

					if (currentNode.size > 0) {

						currentNode.particle = this.createParticleList(
							{x: currentNode.x, y: currentNode.y, z: 1},
							currentNode.desc,
							currentNode.size);

						this.particleGroup.push(currentNode.particle);
						currentNode.particle.geometry.colorActive = false;

						currentNode.text = this.createItemList(
							{x: currentNode.x, y: currentNode.y, z: 0},
							currentNode.name,
							currentNode.desc,
							listType,
							currentNode.size );
						if (listType == 'left')
							currentNode.text.position.set(currentNode.x - currentNode.text.geometry.parameters.width/2, currentNode.y, 0);
						else 
							currentNode.text.position.set(currentNode.x + currentNode.text.geometry.parameters.width/2, currentNode.y, 0);

						group.add(currentNode.particle);
						group.add(currentNode.text);
						this.nodeGroup.add( group );
					}

				}
				currentList.geometry = new THREE.Line( skullList, material );
				currentList.geometry.name = 'Geometry List ' + i;
				this.nodeGroup.add( currentList.geometry );

			}
		}

	}

	this.drawText = function( text, sizeParticle, align ) {

		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		var fontSize = 20;
		var font = fontSize + "px Arial";

		var maxWidth = 1;

		var arrMessage = text.split('\n');

		for (var i = 0; i < arrMessage.length; i++) {
			ctx.font = font;
			var txt = arrMessage[i];
			var cw = ctx.measureText(txt).width;
			maxWidth = ( cw > maxWidth) ? cw : maxWidth;
		}

		var margin = 20,
			w = maxWidth + (fontSize * 4),
			h = 128;

		if(text.length < 1)
			var w = 1, h = 1;
		
		canvas.width = w;
		canvas.height = h;

		// fill the canvas
		// ctx.fillStyle = "rgba(204, 204, 204, 0.8)";
		// ctx.fillRect(0,0,w,h);	

		var x,
			y = h/2 + fontSize/2;

		for (var i = 0; i < arrMessage.length; i++) {
			ctx.font = font;
			ctx.fillStyle = "#808080";
			if (align == 'right') {
				ctx.textAlign = 'left';
				x = 0 + fontSize;
			} else {
				ctx.textAlign = 'right';
				x = w - fontSize;
			}
			var txt = arrMessage[i].toUpperCase();
			if (arrMessage.length < 2)
				ctx.fillText(txt, x, y );
			else
				ctx.fillText(txt, x, fontSize * ( i + 1 ) + ( arrMessage.length * fontSize ) );

		}
		// canvas contents will be used for a texture
		var texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;
		var material = new THREE.MeshBasicMaterial( {map: texture, side:THREE.DoubleSide } );
		material.transparent = true;
		var sprite = new THREE.Mesh(
			new THREE.PlaneGeometry(canvas.width, canvas.height),
			material
		);
		
		return sprite;

	}

	this.createItemList = function(pos, text, desc, align, sizeParticle) {

		var itemText = this.drawText(text, sizeParticle, align);
		itemText.position.set(pos.x, pos.y, pos.z);
		itemText.name = desc;

		return itemText;

	}

	this.drawParticle = function(size) {

		var geometry = new THREE.CircleGeometry( size, 32 );
		var material = new THREE.MeshBasicMaterial( {color: 0xCCCCCC} );
		var particle = new THREE.Mesh( geometry, material );

		return particle;

	}

	this.createParticleList = function(pos, desc, size) {

		var particle = this.drawParticle(size);
		particle.position.set(pos.x, pos.y, pos.z);

		particle.name = desc;

		return particle;

	}

	this.onWindowResize = function() {

		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.glRenderer.setSize( window.innerWidth, window.innerHeight );
		this.cssRenderer.setSize( window.innerWidth, window.innerHeight );

	}

	this.onWindowClick = function(e) {

		var self = this;

		self.mouseX = ( e.clientX - self.windowHalfX );
		self.mouseY = ( e.clientY - self.windowHalfY );

		new TWEEN.Tween( self.globeGroup.rotation ).to( {
			x: ( self.mouseY ) / 100,
			y: - ( self.mouseX ) / 100 
		}, 2000 )
		.easing( TWEEN.Easing.Elastic.Out).start();

	}

	this.update = function() {

		window.requestAnimationFrame( this.update.bind(this) );

		this.render();

		this.animateList();

	}

	this.render = function() {

		TWEEN.update();

		this.glRenderer.render( this.glScene, this.camera );
		this.cssRenderer.render( this.cssScene, this.camera );

	}

	this.animateList = function() {

		for (var i = 0; i < this.list.length; i++) {

			var currentList = this.list[i];
			var listType = currentList.type;
			var listData = currentList.data;
			var list = currentList.geometry;
			var geometry = list.geometry;
			geometry.verticesNeedUpdate = true;

			var vertices = geometry.vertices;

			for (var j = 0; j < listData.length; j++) {
				var currentNode = listData[j];
				var currentVertice = vertices[j];

				currentVertice.setX( currentNode.x );
				currentVertice.setY( currentNode.y );

				if (currentNode.particle)
					currentNode.particle.position.set(currentNode.x, currentNode.y, 1);

				if (currentNode.text) {
					if (listType == 'right')
						currentNode.text.position.set(currentNode.x + currentNode.text.geometry.parameters.width/2, currentNode.y, 0);
					else 
						currentNode.text.position.set(currentNode.x - currentNode.text.geometry.parameters.width/2, currentNode.y, 0);
				}

				if (currentNode.x + currentNode.dx > currentNode.maxWidth || currentNode.x + currentNode.dx < currentNode.minWidth)
					currentNode.dx = -currentNode.dx;
				if (currentNode.y + currentNode.dy > currentNode.maxHeight || currentNode.y + currentNode.dy < currentNode.minHeight)
					currentNode.dy = -currentNode.dy;

				currentNode.x += currentNode.dx;
				currentNode.y += currentNode.dy;
			}
		}

	}

	this.handleHoverParticle = function(e) {

		var raycaster = this.raycaster,
			mouse = this.mouse;

		mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
		mouse.y = -2 * (e.clientY / window.innerHeight) + 1;
		mouse.z = 1;

		raycaster.setFromCamera(mouse, this.camera);
		var intersects = raycaster.intersectObjects(this.particleGroup);

		if (intersects.length > 0) {
			var _this = intersects[0].object;

			if ( _this.geometry.type == "CircleGeometry") {

				if (_this.geometry.colorActive == false) {

					_this.material.color.set(new THREE.Color('#3399CC'));

				}
				_this.scale.set(2,2,2);

				window.document.body.style.cursor = 'pointer';

			} else {
				for (var i = 0; i < this.particleGroup.length; i++) {

					var _this = this.particleGroup[i];

					if ( _this.geometry.type == "CircleGeometry") {

						if (_this.geometry.colorActive == false) {
						
							_this.material.color.set(new THREE.Color('#CCCCCC'));
							_this.scale.set(1,1,1);
						
						}
						window.document.body.style.cursor = 'auto';
					}
				}
			}

		} else {

			for (var i = 0; i < this.particleGroup.length; i++) {
				var _this = this.particleGroup[i];
				if ( _this.geometry.type == "CircleGeometry") {

					_this.scale.set(1,1,1);

					if (_this.geometry.colorActive == false) {
						_this.material.color.set(new THREE.Color('#CCCCCC'));
					}
					window.document.body.style.cursor = 'auto';
				}
			}


		}

	}

	this.handleClickParticle = function(e) {

		var raycaster = this.raycaster,
			mouse = this.mouse,
			sphereRadius = 128;

		mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
		mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
		raycaster.setFromCamera(this.mouse, this.camera);

		var intersects = raycaster.intersectObjects(this.particleGroup);

		if (intersects.length > 0) {

			clearSpace('Overlay', this.cssScene);
			clearSpace('Info text', this.glScene);

			for (var i = 0; i < this.particleGroup.length; i++) {
				var _this = this.particleGroup[i];

				_this.geometry.colorActive = false
				_this.material.color.set(new THREE.Color('#CCCCCC'));
				_this.scale.set(1,1,1);
				window.document.body.style.cursor = 'auto';

			}

			var _this = intersects[0].object;


			_this.geometry.colorActive = true;
			_this.material.color.set(new THREE.Color('#3399CC'));
			_this.scale.set(2,2,2);

			// Use the intersected objects: 
			// intersects[0] represents the foremost object that was hovered
			var message = _this.name;

			var div = document.createElement( 'div' );
			div.id = 'geometryMessage';
			div.style.width = (this.globeRadius) + 'px';
			div.style.height = (this.globeRadius) + 'px';
			div.style.backgroundColor = 'transparent';

			var html = ['<p>' + message + '</p>'].join('\n');
			div.innerHTML = html;

			var overlay = new THREE.CSS3DObject( div );

			overlay.name = 'Overlay';
			overlay.position.set(0, 0, this.globeRadius);

			var mesh = new THREE.Mesh(
				new THREE.CircleGeometry(this.globeRadius/1.9, 100), 
				new THREE.MeshBasicMaterial({
					color: 0x808080,
					opacity: 0.7,
					side: THREE.DoubleSide
				})
			);
			mesh.position.set(0, 0, this.globeRadius);
			mesh.name = 'Info text';

			this.glScene.add( mesh );
			this.cssScene.add( overlay );


		} else {
			clearSpace('Overlay', this.cssScene);
			clearSpace('Info text', this.glScene);

			for (var i = 0; i < this.particleGroup.length; i++) {
				var _this = this.particleGroup[i];

				_this.geometry.colorActive = false
				_this.material.color.set(new THREE.Color('#CCCCCC'));
				_this.scale.set(1,1,1);
				window.document.body.style.cursor = 'auto';

			}

		}

	}

	var clearSpace = function(name, scene) {

		var object = scene.getObjectByName(name);
		if (object)
			scene.remove(object);

	}

}