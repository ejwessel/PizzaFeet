// @input int type = 0 {"widget":"combobox", "values":[{"label":"Left", "value":0}, {"label":"Right", "value":1}]}

const FIXED_ML_ROTATION = MathLib.quat.fromEulerVec(new MathLib.vec3(Math.PI * 0.0, Math.PI * 0.0, Math.PI * 0.5));
var binding = null;

global.FootBinding = function() {
    this.inObjectPoints = null;

    this.binding = null;
    this.bindingTF = null;

    this.trackedMeshVisuals = null;
    
    this.isVisible = null;
};


FootBinding.prototype = {
    setObject: function(object) {
        this.binding = object;
        this.bindingTF = this.binding.getTransform();

        this.trackedMeshVisuals = recursiveGetComponents(this.binding);
        
    },

    setTransform: function(transform) {
        // Rotate
        var trueRot = MathLib.rodriguesToQuat(new MathLib.vec3(-transform[1], -transform[0], -transform[2]));
        trueRot = trueRot.multiply(FIXED_ML_ROTATION);
        this.bindingTF.setWorldRotation(MathLib.quat.toEngine(trueRot));

        // Translate
        var center = new vec3(-transform[4], -transform[3], -transform[5]);
        this.bindingTF.setWorldPosition(center);
    },

    setEnabled: function(value) {
        for (var i = 0; i < this.trackedMeshVisuals.length; i++) {
            if (this.trackedMeshVisuals[i])
                this.trackedMeshVisuals[i].enabled = value;
        }
        
        this.isVisible = value;
    }
};

function recursiveGetComponents(scnObject) {
    var resultArray = []
    
    for (var i = 0; i < scnObject.getChildrenCount(); i++) {
           var meshVisuals = scnObject.getChild(i).getComponents("Component.BaseMeshVisual");
        
            for (var j = 0; j < meshVisuals.length; j++) {
                 resultArray.push(meshVisuals[j]);
            }
            
           var childArray = recursiveGetComponents(scnObject.getChild(i));
           for (var j = 0; j < childArray.length; j++) {
                resultArray.push(childArray[j]);   
           }
    }
    
    return resultArray
}

function createBinding(points) {
    binding = new FootBinding();
    binding.setObject(script.getSceneObject());

    binding.inObjectPoints = new Float32Array(points.length);
    binding.inObjectPoints.set(points);

    if (script.type) {
        binding.inObjectPoints = global.MathLib.reflectX(binding.inObjectPoints);
    }

    return binding;
}

function getBinding() {
    return binding;
}



script.api.createBinding = createBinding;
script.api.getBinding = getBinding;
