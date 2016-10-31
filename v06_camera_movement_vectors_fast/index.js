let processor = {
	doLoad: function() {
		this.video = document.getElementById("video");
		this.outpu = document.getElementById("outpu");
		this.frams = document.getElementById("frams");
		this.layer = [];
		this.fps = { t: Date.now(), c: 0 };
		this.mouse = {x: 10, y: 10};
		this.width = this.video.width;
		this.height = this.video.height;
		let self = this;
		
		this.layer.push({ show: true, type: 'camera', inputVideo: this.video, w: this.width, h: this.height });
		this.layer.push({ show: true, type: 'timediff', input: this.layer[0] });
		this.layer.push({ show: true, type: 'convolute', weights: [  1, -1,
																	 1, -1], input: this.layer[0] });
		this.layer.push({ show: true, type: 'convolute', weights: [  1,  1,
																	-1, -1], input: this.layer[0] });
		this.layer.push({ show: true, type: 'arithmetic', func: function(a,b) {
			return b<-10? 50*a/b : 10<b? 50*a/b : 0 }, input: [ this.layer[1], this.layer[2] ] });
		this.layer.push({ show: true, type: 'arithmetic', func: function(a,b) {
			return b<-10? 50*a/b : 10<b? 50*a/b : 0 }, input: [ this.layer[1], this.layer[3] ] });
		this.layer.push({ show: false, type: 'vector', output: this.layer[0], input: [ this.layer[4], this.layer[5] ] });

		//this.layer.push({ show: true, type: 'grayscale', input: this.layer[0] });
		//this.layer.push({ show: true, type: 'inertia', fade: 0.8, input: this.layer[0] });

		this.makeLayers(this.layer, 1/8	);

		if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
				self.video.src = window.URL.createObjectURL(stream);
				self.video.play();
			}).then(function() {
				self.loop();
			});
		}
		window.addEventListener('mousemove', function(e) { self.mmove(e); }, false);
	},
	
	makeLayers: function(layers, scale) {
		for (let i=0; i<layers.length; i++) {
			let layer = layers[i];
			layer.w = layer.w || (this.width  * scale);
			layer.h = layer.h || (this.height * scale);
			layer.scale = scale;
			layer.actio = this[layer.type];
			if (!layer.show) continue;
			layer.canva = document.createElement('canvas');
			layer.canva.width = layer.w;
			layer.canva.height = layer.h;
			layer.canva.style.border = "1px solid";
			layer.contx = layer.canva.getContext('2d');
			layer.image = layer.contx.createImageData(layer.w, layer.h);
			this.outpu.appendChild(layer.canva);
		}
	},

	loop: function() {
		this.fps.c++;
		let layer, last_layer;
		for (let i=0; i<this.layer.length; i++) {
			let layer = this.layer[i];
			filter[layer.type].call(layer, layer.input || last_layer);
			last_layer = layer;
		}

		if ( this.fps.t+1000<Date.now() ) {
			this.frams.innerHTML = this.fps.c + 'fps';
			this.fps = { t: Date.now(), c: 0 };
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
		let x,y,xx,yy,ii,i,offs
			,pixels = this.contx.getImageData(0, 0, this.w, this.h)
			,data = new Uint8Array(pixels.data.buffer)
			,ww = Math.floor(this.w * this.scale)
			,hh = Math.floor(this.h * this.scale)
			,r = Math.floor(1/this.scale)
			,rr = r*r
			,outp = this.buffe || (this.buffe = new Float64Array(ww*hh))
			;
		for(ii=0; ii<outp.length; ii++) {
			yy = Math.floor(ii/ww);
			xx = ii%ww;
			i = (yy*r*this.w+xx*r)*4;
			outp[ii] = 0;
			for(y=0; y<r; y++, i+=(this.w-r)*4) {
				for(x=0; x<r; x++, i+=4) {
					outp[ii] += (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2])/rr;
				}
			}
		}
	},
	grayscale : function(input) {
		let i
			,outp = input.buffe;
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
			,half = Math.floor(side/2)
			,outp = this.buffe || (this.buffe = new Float64Array(inpu.length))
			,offs = []
			,i,x,y,wt;
		for (i=0; i<outp.length; i++) { outp[i] = 0; }
		for (y=0; y<side; y++) {
			for (x=0; x<side; x++) {
				wt = weig[y*side+x];
				offs = (y-half)*this.w+(x-half);
				for (i=0; i<outp.length; i++,offs++) {
					outp[i] += wt * inpu[offs];
				}
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
		let scale = input[0].scale
			,w = input[0].w
			,h = input[0].h
			,inpX = input[0].buffe
			,inpY = input[1].buffe
			,f = 0.05
			;
		if (!this.output.image) return;
		let x, y, i, ctx = this.output.contx;
		ctx.beginPath();
		for (y=0; y<h; y++) {
			for (x=0; x<w; x++) {
				i = y * w + x;
				ctx.moveTo(0.5 + x/scale, 0.5 + y/scale);
				ctx.lineTo((x + f*inpX[i])/scale, (y + f*inpY[i])/scale);
			}
		}
		ctx.strokeStyle = '#00ffff';
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