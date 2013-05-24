// neurons

// standard shim
window.requestAnimFrame = (function(){
	return window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function( callback ) {
		window.setTimeout(callback, 1000 / 60);
	};
})();

// helper functions
function randomMax(max) {
	return Math.floor(Math.random() * max);
}
function lightenColor(color, percent) {
	var num = parseInt(color.slice(1),16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, B = (num >> 8 & 0x00FF) + amt, G = (num & 0x0000FF) + amt;
	return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}
function distance(neuron1, neuron2) {
	return Math.sqrt(Math.pow(neuron1.x - neuron2.x, 2) + Math.pow(neuron1.y - neuron2.y, 2));
}

// dom stuff and fps counter
var canvas = document.getElementById('mainCanvas');
var fpsOut = document.getElementById('fps');
var ctx = canvas.getContext('2d');
var fps = 0, now, lastUpdate = (new Date())*1 - 1, fpsFilter = 50;

// globals
var numNeurons = 200,
	neuronRadius = 5,
	neuronHalfRadius = Math.floor(neuronRadius / 2),
	neuronColor = '#43B565',
	neuronCoreColor = lightenColor(neuronColor, -20),
	activeNeuronLightFactor = 80,
	activeToInactiveTimeRatio = 3,
	neuronXBegin = Math.floor(canvas.width * 0.1),
	neuronXEnd = Math.floor(canvas.width * 0.9),
	neuronYBegin = Math.floor(canvas.height * 0.10),
	neuronYEnd = Math.floor(canvas.height * 0.90),
	jointCurves = 50,
	neuronBaseCycleDiff = 300;

var Neuron = function (id) {
	this.id = id;
	this.x = neuronXBegin + randomMax(neuronXEnd - neuronXBegin);
	this.y = neuronYBegin + randomMax(neuronYEnd - neuronYBegin);
	this.curveX = randomMax(jointCurves) - randomMax(2 * jointCurves);
	this.curveY = randomMax(jointCurves) - randomMax(2 * jointCurves);
	this.soma = undefined;
	this.neuronCycle = 60 + randomMax(neuronBaseCycleDiff);
	this.neuronCycleCounter = 0;
	this.neuronState = 'inactive';
};
Neuron.prototype.draw = function (id) {
	var currentNeuronColor = neuronColor;
	if (this.neuronState === 'inactive') {
		this.neuronCycleCounter++;
		if (this.neuronCycleCounter >= this.neuronCycle) {
			this.neuronState = 'active';
			this.neuronCycleCounter = this.neuronCycle / activeToInactiveTimeRatio;

			this.soma.neuronState = 'active';
			this.soma.neuronCycleCounter = this.soma.neuronCycle / activeToInactiveTimeRatio;
		}
	} else if (this.neuronState === 'active') {
		this.neuronCycleCounter--;
		currentNeuronColor = lightenColor(neuronColor, activeNeuronLightFactor * (this.neuronCycleCounter / this.neuronCycle));
		if (this.neuronCycleCounter <= 0) {
			this.neuronState = 'inactive';
			this.neuronCycleCounter = 0;
		}
	}
	if (this.soma) {
		ctx.strokeStyle = currentNeuronColor;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.quadraticCurveTo(this.x + this.curveX, this.y + this.curveY, this.soma.x, this.soma.y);
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.fillStyle = currentNeuronColor;
	ctx.arc(this.x, this.y, neuronRadius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.beginPath();
	ctx.fillStyle = neuronCoreColor;
	ctx.arc(this.x, this.y, neuronHalfRadius, 0, 2 * Math.PI);
	ctx.fill();
};

var NeuronSystem = function () {
	this.neurons = [];
	var i, pickedNeuron;
	for (i = 0; i < numNeurons; i++) {
		this.neurons.push(new Neuron(i));
	}
	for (i = 0; i < this.neurons.length; i++) {
		for (var j = 0; j < this.neurons.length; j++) {
			if (i !== j) {
				if (typeof pickedNeuron === 'undefined') {
					pickedNeuron = this.neurons[j];
				}
				if (distance(this.neurons[i], this.neurons[j]) < distance (this.neurons[i], pickedNeuron)) {
					if (this.neurons[j].soma && this.neurons[j].id !== i) {
						pickedNeuron = this.neurons[j];
					}
				}
			}
		}

		this.neurons[i].soma = pickedNeuron;
		pickedNeuron = undefined;
	}
};
NeuronSystem.prototype.draw = function () {
	for (var i = 0; i < this.neurons.length; i++) {
		this.neurons[i].draw(i);
	}
};

var gui = new dat.GUI();
gui.add(window, 'numNeurons').min(20).max(500).step(1).name('Neuron Count').onFinishChange(function(){
	neuronSystem = new NeuronSystem();
});
gui.add(window, 'activeToInactiveTimeRatio').min(0.5).max(10).step(1).name('Active Time Ratio');
gui.add(window, 'activeNeuronLightFactor').min(10).max(100).step(1).name('Active Lighten');
gui.add(window, 'neuronBaseCycleDiff').min(0).max(500).step(1).onFinishChange(function(){
	for (var i = 0; i < neuronSystem.neurons.length; i++) {
		neuronSystem.neurons[i].neuronCycle = 60 + randomMax(neuronBaseCycleDiff);
	}
});
gui.add(window, 'jointCurves').min(1).max(100).step(1).name('Joints Deviation').onFinishChange(function(){
	for (var i = 0; i < neuronSystem.neurons.length; i++) {
		neuronSystem.neurons[i].curveX = randomMax(jointCurves) - randomMax(2 * jointCurves);
		neuronSystem.neurons[i].curveY = randomMax(jointCurves) - randomMax(2 * jointCurves);
	}
});
gui.addColor(window, 'neuronColor');
gui.addColor(window, 'neuronCoreColor');

var neuronSystem = new NeuronSystem();

(function animloop(){
	requestAnimFrame(animloop);
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	neuronSystem.draw();

	var thisFrameFPS = 1000 / ((now=new Date()) - lastUpdate);
	fps += (thisFrameFPS - fps) / fpsFilter;
	lastUpdate = now;
})();

setInterval(function(){
  fpsOut.innerHTML = fps.toFixed(1) + " fps";
}, 1000);