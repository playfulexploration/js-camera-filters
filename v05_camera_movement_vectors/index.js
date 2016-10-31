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

		let f=6,w=f*20, h=f*15;
		this.layer.push({ show: true, type: 'camera', w: w, h: h, inputVideo: this.video, downscale: 4 });
		this.layer.push({ show: true, type: 'timediff', w: w, h: h, input: this.layer[0] });
		this.layer.push({ show: true, type: 'convolute', w: w, h: h, weights: [ -1, 1,
																				-1, 1], input: this.layer[0] });
		this.layer.push({ show: true, type: 'convolute', w: w, h: h, weights: [ 1,  1,
																			   -1, -1], input: this.layer[0] });
		this.layer.push({ show: true, type: 'arithmetic', w: w, h: h, func: function(a,b) {
			return (b<-20||20<b)? 100*a/b : 0 }, input: [ this.layer[1], this.layer[2] ] });
		this.layer.push({ show: true, type: 'arithmetic', w: w, h: h, func: function(a,b) {
			return (b<-20||20<b)? 100*a/b : 0 }, input: [ this.layer[1], this.layer[3] ] });
		this.layer.push({ show: true, type: 'vector', w: w, h: h, inputVideo: this.video, input: [ this.layer[4], this.layer[5] ] });

		//this.layer.push({ show: false, type: 'grayscale', w: w, h: h });
		//this.layer.push({ show: false, type: 'inertia', w: w, h: h, fade: 0.8, input: this.layer[0] });

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
			if (!layer.show) continue;
			layer.canva = document.createElement('canvas');
			layer.canva.width = layer.w;
			layer.canva.height = layer.h;
			layer.canva.style.border = "1px solid";
			layer.contx = layer.canva.getContext('2d');
			layer.actio = this[layer.type];
			layer.image = layer.contx.createImageData(layer.w, layer.h);
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
			,data = new Uint8Array(pixels.data.buffer)
			,outp  = this.buffe || (this.buffe = new Float64Array(data.length/4))
			;
		for(let i=0; i<data.length; i+=4)
			outp[i/4] = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
	},
	
	grayscale : function(input) {
		let outp = input.buffe;
		this.buffe = input.buffe;

		if (!this.image) return;
		let data = new Uint8Array(this.image.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = outp[i/4];
			data[i+3] = 255;
		}
		this.contx.putImageData(this.image, 0, 0);
	},

	timediff : function(input) {
		let inpu = input.buffe
			,fade = this.fade
			,appl = 1-fade
			,last = this.lastt || Float64Array.from(inpu)
			,outp = new Float64Array(inpu.length)
			,sum = 0
			,dif
			;
		for(i=0; i<inpu.length; i++) {
			outp[i] = dif = inpu[i] - last[i];
			sum |= dif;
		}
		this.lastt = new Float64Array(inpu);
		if (!this.buffe) this.buffe = outp; // set buffer if never set
		if (!sum) return;  // get out if no change, camera image wasn't updated
		this.buffe = outp;
		if (!this.image) return;
		let data = new Uint8Array(this.image.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = Math.max(0, Math.min(255, 128 + outp[i/4]));
			data[i+3] = 255;
		}
		this.contx.putImageData(this.image, 0, 0);
	},
	
	inertia : function(input) {
		let inpu = input.buffe
			,fade = this.fade
			,appl = 1-fade
			,outp = this.buffe || (this.buffe = new Float64Array(inpu.length))
			;
		for (i=0; i<outp.length; i++) {
			outp[i] *= fade;
			outp[i] += appl*inpu[i];
		}
		if (!this.image) return;
		let data = new Uint8Array(this.image.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = Math.max(0, Math.min(255, outp[i/4]));
			data[i+3] = 255;
		}
		this.contx.putImageData(this.image, 0, 0);
	},

	arithmetic : function(input) {
		let inp0 = input[0].buffe
			,inp1 = input[1].buffe
			,outp = this.buffe || (this.buffe = new Float64Array(inp0.length))
			,func = this.func
			;
		for (i=0; i<outp.length; i++) {
			outp[i] = func(inp0[i],inp1[i]);
		}
		if (!this.image) return;
		let data = new Uint8Array(this.image.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = Math.max(0, Math.min(255, 128 + outp[i/4]));
			data[i+3] = 255;
		}
		this.contx.putImageData(this.image, 0, 0);
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
		if (!this.image) return;
		let data = new Uint8Array(this.image.data.buffer)
		for(i=0; i<data.length; i+=4) {
			data[i+2] = data[i+1] = data[i] = Math.max(0, Math.min(255, 128 + outp[i/4]));
			data[i+3] = 255;
		}
		this.contx.putImageData(this.image, 0, 0);
	},

	vector : function(input) {
		let inpX = input[0].buffe
			,inpY = input[1].buffe
			,w = this.w
			,r = this.r || 6
			,d = 8 * r * r
			;
		if (!this.image) return;
		let x, y, xx, yy, vx, vy, i, ctx = this.contx;
		if (this.inputVideo)
			this.contx.drawImage(this.inputVideo, 0, 0, this.w, this.h);
		else
			ctx.clearRect(0, 0, w, this.h);
		ctx.beginPath();
		for (y=0; y<this.h; y+=2+r) {
			for (x=r; x<w; x+=2*r) {
				vx = vy = 0;
				for (yy=-r; yy<r; yy++) {
					for (xx=-r; xx<r; xx++) {
						i = w * (y+yy) + (x+xx);
						vx += inpX[i];
						vy += inpY[i];
					}
				}
				ctx.moveTo(0.5 + x, 0.5 + y);
				ctx.lineTo(x - vx/d, y + vy/d);
			}
		}
		ctx.strokeStyle = '#00ffff'
		ctx.stroke();
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
function drawScaled() {
	var canvasTemp = document.createElement("canvas");
	canvasTemp.getContext("2d").putImageData(this.image, 0, 0);
	
	var imageObject=new Image()
		,self = this;
	imageObject.onload=function(){
		self.contx.scale(this.image.width/this.canva.width, this.image.height/this.canva.height);
		self.contx.drawImage(imageObject,0,0);
	}
	imageObject.src=canvasTemp.toDataURL();
}