let processor = {
	doLoad: function() {
		this.video = document.getElementById("video");
		this.frams = document.getElementById("frams");
		this.outpu = document.getElementById("outpu");
		this.layer = [];
		this.fps_t = Date.now();
		this.fps_c = 0;
		this.mouse = {x: 10, y: 10};
		this.color = {r:128, g: 128, b: 128};
		let self = this;

		let f=1,w=f*80, h=f*60, gs;
		this.layer.push({ type: 'camera', w: w, h: h, inputVideo: this.video });
		this.layer.push({ type: 'grayscale', w: w, h: h });
		this.layer.push({ type: 'inertia', w: w, h: h, fade: 0.8, input: this.layer[0] });
		this.layer.push({ type: 'timediff', w: w, h: h, input: this.layer[0] });
		this.layer.push({ type: 'convolute', w: w, h: h, weights: [	-1, 0, 1,
																	-1, 0, 1,
																	-1, 0, 1], input: this.layer[0] });
		this.layer.push({ type: 'convolute', w: w, h: h, weights: [	 1, 1, 1,
																	 0, 0, 0,
																	-1,-1,-1], input: this.layer[0] });

		this.makeLayers(this.layer);
		
		if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
				self.video.src = window.URL.createObjectURL(stream);
				self.video.play();
			}).then(function() {
				self.width = self.video.videoWidth;
				self.height = self.video.videoHeight;
				self.loop();
			});
		}
		window.addEventListener('mousemove', function(e) { self.mmove(e); }, false);
	},
	
	makeLayers: function(layers) {
		for (let i=0; i<layers.length; i++) {
			let layer = layers[i];
			layer.canva = document.createElement('canvas');
			layer.canva.width = layer.w;
			layer.canva.height = layer.h;
			layer.canva.style.border = "1px solid";
			layer.contx = layer.canva.getContext('2d');
			layer.actio = this[layer.type];
			this.outpu.appendChild(layer.canva);
		}
	},

	loop: function() {
		this.fps_c++;
		let layer, last_layer;
		for (let i=0; i<this.layer.length; i++) {
			let layer = this.layer[i];
			filter[layer.type].call(layer, layer.input || last_layer);
			last_layer = layer;
		}
		if ( this.fps_t+1000<Date.now() ) {
			this.frams.innerHTML = this.fps_c + 'fps';
			this.fps_t = Date.now();
			this.fps_c = 0;
		}
		let self = this;
		setTimeout(function () { self.loop(); }, 0);
	},

	mmove: function(e) {
		this.mouse = getMousePos(this.layer[0].canva, e);
		this.layer[0].contx.fillStyle = "#000000";
		this.layer[0].contx.fillRect(this.mouse.x-2, this.mouse.y-2, 4, 4);
	},
};

//////////////////////////////////////////////////////////////
// Convolution Filter
let filter = {
	camera: function() {
		this.contx.drawImage(this.inputVideo, 0, 0, this.w, this.h);
		let pixels = this.contx.getImageData(0, 0, this.w, this.h)
			,buff32 = new Uint8Array(pixels.data.buffer)
			,graysc  = this.buffe || (this.buffe = new Float64Array(buff32.length/4))
			;
		for(let i=0; i<buff32.length; i+=4)
			graysc[i/4] = 0.2126 * buff32[i] + 0.7152 * buff32[i+1] + 0.0722 * buff32[i+2];
	},
	
	grayscale : function(input) {
		let outp = input.buffe;
		this.buffe = input.buffe;

		let img = this.contx.createImageData(this.w, this.h)
			,data = new Uint8Array(img.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = outp[i/4];
			data[i+3] = 255;
		}
		this.contx.putImageData(img, 0, 0);
	},

	timediff : function(input) {
		let inpu = input.buffe
			,fade = this.fade
			,appl = 1-fade
			,last  = this.buffe || Float64Array.from(inpu)
			;
		let img = this.contx.createImageData(this.w, this.h)
			,data = new Uint8Array(img.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = Math.max(0, Math.min(255, 128 + inpu[i/4] - last[i/4]));
			data[i+3] = 255;
		}
		this.contx.putImageData(img, 0, 0);

		this.buffe = new Float64Array(inpu);
	},
	
	inertia : function(input) {
		let inpu = input.buffe
			,fade = this.fade
			,appl = 1-fade
			,outp  = this.buffe || (this.buffe = new Float64Array(inpu.length))
			;
		for (i=0; i<outp.length; i++) {
			outp[i] *= fade;
			outp[i] += appl*inpu[i];
		}
		let img = this.contx.createImageData(this.w, this.h)
			,data = new Uint8Array(img.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = Math.max(0, Math.min(255, outp[i/4]));
			data[i+3] = 255;
		}
		this.contx.putImageData(img, 0, 0);
	},
	
	convolute : function(input) {
		let inpu = input.buffe
			,weig = this.weights
			,side = Math.round(Math.sqrt(weig.length))
			,outp  = this.buffe || (this.buffe = new Float64Array(inpu.length))
			,m,i;
		for (i=0; i<outp.length; i++) { outp[i] = 0; }
		for (m=0; m<weig.length; m++) {
			let wt = weig[m]
				,offs = (m%side)+this.w*Math.floor(m/side);
			for (i=0; i<outp.length; i++,offs++) {
				outp[i] += wt * inpu[offs];
			}
		}
		let img = this.contx.createImageData(this.w, this.h)
			,data = new Uint8Array(img.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = Math.max(0, Math.min(255, 128 + outp[i/4]));
			data[i+3] = 255;
		}
		this.contx.putImageData(img, 0, 0);
	},
};

//////////////////////////////////////////////////////////////
// Helper functions
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}
