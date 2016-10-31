let processor = {
  doLoad: function() {
    this.video = document.getElementById("video");
    this.frams = document.getElementById("frams");
    this.canv1 = document.getElementById("canv1");
    this.canv2 = document.getElementById("canv2");
    this.canv3 = document.getElementById("canv3");
    this.cntx1 = this.canv1.getContext("2d");
    this.cntx2 = this.canv2.getContext("2d");
    this.cntx3 = this.canv3.getContext("2d");
	this.fps_t = Date.now();
	this.fps_c = 0;
	this.mouse = {x: 10, y: 10};
	this.color = {r:128, g: 128, b: 128};
    let self = this;
	
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

  loop: function() {
	this.fps_c++;
    this.computeFrame();
	if ( this.fps_t+1000<Date.now() ) {
		this.frams.innerHTML = this.fps_c + 'fps';
		this.fps_t = Date.now();
		this.fps_c = 0;
	}
    let self = this;
    setTimeout(function () { self.loop(); }, 0);
  },

  computeFrame: function() {
    this.cntx1.drawImage(this.video, 0, 0, this.canv1.width, this.canv1.height);
    let pixels = this.cntx1.getImageData(0, 0, this.canv1.width, this.canv1.height);
	pixels = filter.grayscale(pixels);
    this.cntx2.putImageData(pixels, 0, 0);
    this.cntx3.putImageData(filter.convolute(pixels,
		[ -1, 0, 1,
		  -1, 0, 1,
		  -1, 0, 1]), 0, 0);
  },
  
  mmove: function(e) {
	this.mouse = getMousePos(this.canv1, e);
    this.cntx1.fillStyle = "#000000";
    this.cntx1.fillRect(this.mouse.x-2, this.mouse.y-2, 4, 4);
  },
};

//////////////////////////////////////////////////////////////
// Convolution Filter
let filter = {
	convolute: function(pixels, weights) {
		let side = Math.round(Math.sqrt(weights.length))
			,s_data = pixels.data
			,w = pixels.width
			,h = pixels.height
			,target = this.createImageData(w, h)
			,t_data = target.data
			,data = []
			,c,m;
		for (m=0; m<weights.length; m++) {
			let wt = weights[m]
				,offs = 4*((m%side)+w*Math.floor(m/side))
				,i;
			for (i=0; i<s_data.length; i++,offs++) {
				data[i] = (data[i]||128) + wt * s_data[offs];
			}
		}
		for (i=0; i<s_data.length; i++) {
			if ((i%4)==3) t_data[i] = 255;
			else t_data[i] = data[i];
		}
		return target;
	},
	grayscale : function(pixels) {
		let s_data = pixels.data
			,target = this.createImageData(pixels.width, pixels.height)
			,t_data = target.data
			,c
			;
		for (let i=0; i<s_data.length; i+=4) {
			c = 0.2126*s_data[i+0] + 0.7152*s_data[i+1] + 0.0722*s_data[i+2];
			t_data[i+0] = t_data[i+1] = t_data[i+2] = c;
			t_data[i+3] = 255;
		}
		return target;
	},
	createImageData: function(w,h) {
		let cv = this.tmpCanvas || (this.tmpCanvas=document.createElement('canvas'));
		let cx = this.tmpCtx||(this.tmpCtx=cv.getContext('2d'));
		return cx.createImageData(w,h);
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
