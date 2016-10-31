let processor = {
  doLoad: function() {
    this.video = document.getElementById("video");
    this.frams = document.getElementById("frams");
    this.canv1 = document.getElementById("c1");
    this.cntx1 = this.canv1.getContext("2d");
	this.fps_t = Date.now();
	this.fps_c = 0;
    let self = this;
	
    this.video.addEventListener("play", function() {  }, false);
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
  }
};