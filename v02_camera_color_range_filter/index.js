let processor = {
  doLoad: function() {
    this.video = document.getElementById("video");
    this.frams = document.getElementById("frams");
    this.canv1 = document.getElementById("canv1");
    this.canv2 = document.getElementById("canv2");
    this.cntx1 = this.canv1.getContext("2d");
    this.cntx2 = this.canv2.getContext("2d");
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
    let frame = this.cntx1.getImageData(0, 0, this.canv1.width, this.canv1.height);
	let r,g,b,i
		,l = frame.data.length / 4
		,range = 50
		,rm = this.color.r-range
		,rx = this.color.r+range
		,gm = this.color.g-range
		,gx = this.color.g+range
		,bm = this.color.b-range
		,bx = this.color.b+range
		;
		
    for (i = 0; i < l; i++) {
		r = frame.data[i * 4 + 0];
		g = frame.data[i * 4 + 1];
		b = frame.data[i * 4 + 2];
		if (   rm<r&&r<rx
			&& gm<g&&g<gx
			&& bm<b&&b<bx
			)
			frame.data[i * 4 + 3] = 0;
    }
    this.cntx2.putImageData(frame, 0, 0);
  },
  
  mmove: function(e) {
	this.mouse = getMousePos(this.canv1, e);
    let frame = this.cntx1.getImageData(0, 0, this.canv1.width, this.canv1.height);
	let m = this.mouse.y * this.canv1.width + this.mouse.x;
	this.color = {
		r: frame.data[m * 4 + 0],
		g: frame.data[m * 4 + 1],
		b: frame.data[m * 4 + 2],
	}
    this.cntx1.fillStyle = "#000000";
    this.cntx1.fillRect(this.mouse.x-2, this.mouse.y-2, 4, 4);
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
