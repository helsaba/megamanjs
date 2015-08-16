Engine.World = function()
{
    var ambientLight = new THREE.AmbientLight(0xffffff);

    this.camera = new Engine.Camera(new THREE.PerspectiveCamera(75, 600 / 400, 0.1, 1000));

    this.collision = new Engine.Collision();

    this.events = new Engine.Events();

    this.atmosphericDensity = .1;
    this.atmosphericViscosity = .1;
    this.gravityForce = new THREE.Vector2(0, 9.81);



    this.objects = new Set();

    this.scene = new THREE.Scene();
    this.scene.add(ambientLight);

    this.timeStretch = 1;
    this.timeTotal = 0;
}

Engine.World.prototype.EVENT_UPDATE = 'update';

Engine.World.prototype.addObject = function(object, x, y)
{
    if (object instanceof Engine.Object === false) {
        throw new Error('Invalid object');
    }

    object.position.x = x === undefined ? object.position.x : x;
    object.position.y = y === undefined ? object.position.y : y;

    this.objects.add(object);
    this.collision.addObject(object);
    this.scene.add(object.model);
    object.setWorld(this);
}

Engine.World.prototype.removeObject = function(object)
{
    if (object instanceof Engine.Object === false) {
        throw new Error('Invalid object');
    }
    if (this.objects.delete(object)) {
        this.collision.removeObject(object);
        this.scene.remove(object.model);
    }
}

Engine.World.prototype.updateTime = function(deltaTime)
{
    deltaTime *= this.timeStretch;
    this.timeTotal += deltaTime;
    for (var object of this.objects) {
        object.timeShift(deltaTime * object.timeStretch, this.timeTotal);
    }

    this.collision.detect();

    this.events.trigger(this.EVENT_UPDATE, [deltaTime, this.timeTotal]);
}
