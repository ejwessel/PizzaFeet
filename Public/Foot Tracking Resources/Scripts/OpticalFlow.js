global.OpticalFlow = function() {
    this.texture = null;
    this.textureSize = null;

    this.prevGrayScale = null;
    this.grayScale = null;
    this.textureShape =  null;

    this.winSize = null; 
    this.maxLevel = 0;
    this.maxCount = 0;
    this.epsilon = 0;

    this.modelToOptFlowTexMult = new Float32Array(2);
    this.optFlowToCamTexMult = new Float32Array(2);
};

OpticalFlow.prototype = {
    preprocess: function() {
        TensorMath.textureToGrayscale(this.texture, this.grayScale, this.textureShape)
    },
    apply: function(prevPoints, points, pointsShape) {
        TensorMath.opticalFlow(
            this.prevGrayScale,
            this.grayScale,
            this.textureShape,
            prevPoints,
            points,
            pointsShape,
            this.winSize,
            this.maxLevel,
            this.maxCount,
            this.epsilon
        );
    },
    postprocess: function() {
        this.prevGrayScale.set(this.grayScale, 0);
    },
    setTexture: function(texture) {
        this.texture = texture;
        this.textureSize = new MathLib.vec2(this.texture.getHeight() / 2, this.texture.getWidth() / 2);
        this.textureShape = new vec3(this.textureSize.y, this.textureSize.x, 1);
        this.grayScale = new Uint8Array(this.textureSize.x * this.textureSize.y);
        this.prevGrayScale = new Uint8Array(this.textureSize.x * this.textureSize.y);
    }
};


const subTensor = new Float32Array(1);
subTensor[0] = 1.0;
const subTensorShape = new vec3(1, 1, 1);

global.SmoothStep = function() {
    this.size = 0;
    this.pointsShape = null;
    this.maxFootRatio = 0.05;
    this.prevDiff = null;
    this.newNorm = null;
    this.prevNorm = null;
    this.predLenByFootLen = null;
};

SmoothStep.prototype = {
    resize: function(size) {
        this.size = size;
        this.pointsShape = new vec3(2, size, 1);
        this.sizeShape = new vec3(1, size, 1);
        
        this.prevDiff = new Float32Array(this.size * 2);
        this.prevNorm = new Float32Array(this.size);
        this.predLenByFootLen = new Float32Array(this.size);
    },
    apply: function(prev, cur, next) {
        var size = this.size;

        TensorMath.subTensors(cur,
            this.pointsShape,
            prev,
            this.pointsShape,
            this.prevDiff);

        TensorMath.getVectorsLength(this.prevDiff,
            this.pointsShape,
            this.prevNorm);

        var footLen = TensorMath.maxDistanceBetweenPoints(cur, this.pointsShape);

        TensorMath.mulScalar(this.prevNorm, 1 / footLen, this.predLenByFootLen);

        for (var i = 0; i < size; ++i) {
            if (this.predLenByFootLen[i] < maxFootRatio) {
                this.predLenByFootLen[i] *= 0.5;
            } else {
                this.predLenByFootLen[i] *= 3.5;
            }
        }

        TensorMath.clamp(this.predLenByFootLen, 0.0, 1.0, this.predLenByFootLen);


        TensorMath.mulTensors(cur,
            this.pointsShape,
            this.predLenByFootLen,
            this.sizeShape,
            cur);

        TensorMath.subTensors(subTensor,
            subTensorShape,
            this.predLenByFootLen,
            this.sizeShape,
            this.predLenByFootLen);

        TensorMath.mulTensors(next,
            this.pointsShape,
            this.predLenByFootLen,
            this.sizeShape,
            next);

        TensorMath.addTensors(cur,
            this.pointsShape,
            next,
            this.pointsShape,
            cur);

        return;

        var size = this.size;
        var newDiff = this.newDiff;
        var prevDiff = this.prevDiff;
        var prevNorm = this.prevNorm;
        var predLenByFootLen = this.predLenByFootLen;
        var maxFootRatio = this.maxFootRatio;

        for (var i = 0; i < size; ++i) {
            newDiff[i].x = next[i * 2] - prev[i * 2];
            newDiff[i].y = next[i * 2 + 1] - prev[i * 2 + 1];
            prevDiff[i].x = cur[i * 2] - prev[i * 2];
            prevDiff[i].y = cur[i * 2 + 1] - prev[i * 2 + 1];
        }

        for (var i = 0; i < size; ++i) {
            var x = prevDiff[i].x;
            var y = prevDiff[i].y;
            prevNorm[i] = Math.sqrt(x * x + y * y);
        }
    
        var footLen = 0;
        for (var i = 0; i < size; ++i) {
            for (var j = i + 1; j < size; ++j) {
                var x1 = cur[i * 2];
                var y1 = cur[i * 2 + 1];
                var x2 = cur[j * 2];
                var y2 = cur[j * 2 + 1];
                var x = x1 - x2;
                var y = y1 - y2;
                footLen = Math.max(footLen, (x * x + y * y));
            }
        }
        footLen = Math.sqrt(footLen);
    
        for (var i = 0; i < size; ++i) {
            predLenByFootLen[i] = prevNorm[i] / footLen;
        }
    
        // parabola imitation
        for (var i = 0; i < size; ++i) {
            if (predLenByFootLen[i] < maxFootRatio) {
                predLenByFootLen[i] /= 2;
            } else {
                predLenByFootLen[i] *= 3.5;
            }
            predLenByFootLen[i] = Math.max(0.0, Math.min(predLenByFootLen[i], 1.0));
        }
    
        for (var i = 0; i < cur.length / 2; ++i) {
            cur[i * 2] = cur[i * 2] * predLenByFootLen[i] + next[i * 2] * (1.0 - predLenByFootLen[i]);
            cur[i * 2 + 1] = cur[i * 2 + 1] * predLenByFootLen[i] + next[i * 2 + 1] * (1.0 - predLenByFootLen[i]);
        }
    }
};