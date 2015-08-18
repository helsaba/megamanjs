Engine.traits.Solid = function()
{
    Engine.Trait.call(this);

    this.attackAccept = [
        this.TOP,
        this.BOTTOM,
        this.LEFT,
        this.RIGHT
    ];

    this.ignore = new Set();
}

Engine.Util.extend(Engine.traits.Solid, Engine.Trait);

Engine.traits.Solid.prototype.NAME = 'solid';

Engine.traits.Solid.prototype.TOP = 0;
Engine.traits.Solid.prototype.BOTTOM = 1;
Engine.traits.Solid.prototype.LEFT = 2;
Engine.traits.Solid.prototype.RIGHT = 3;

Engine.traits.Solid.prototype.__collides = function(subject, ourZone, theirZone)
{
    if (!subject.physics) {
        return false;
    }
    if (this.ignore.has(subject)) {
        return false;
    }

    var host = this._host;

    var our = new Engine.Collision.BoundingBox(host.model, ourZone);
    var their = new Engine.Collision.BoundingBox(subject.model, theirZone);

    var attack = this.attackDirection(our, their);

    if (this.attackAccept.indexOf(attack) < 0) {
        /*
        Collision is detected on a surface that should not obstruct.
        This puts this host in the ignore list until uncollides callback
        has been reached.
        */
        this.ignore.add(subject);
        return false;
    }

    if (attack === this.TOP && subject.velocity.y < host.velocity.y) {
        their.bottom(our.t);
        subject.obstruct(host, attack);
    }
    else if (attack === this.BOTTOM && subject.velocity.y > host.velocity.y) {
        their.top(our.b);
        subject.obstruct(host, attack);
    }
    else if (attack === this.LEFT && subject.velocity.x > host.velocity.x) {
        their.right(our.l);
        subject.obstruct(host, attack);
    }
    else if (attack === this.RIGHT && subject.velocity.x < host.velocity.x) {
        their.left(our.r);
        subject.obstruct(host, attack);
    }

    return true;
}

Engine.traits.Solid.prototype.__uncollides = function(subject, ourZone, theirZone)
{
    this.ignore.delete(subject);
}

Engine.traits.Solid.prototype.attackDirection = function(ourBoundingBox, theirBoundingBox)
{
    var distances = [
        Math.abs(theirBoundingBox.b - ourBoundingBox.t),
        Math.abs(theirBoundingBox.t - ourBoundingBox.b),
        Math.abs(theirBoundingBox.r - ourBoundingBox.l),
        Math.abs(theirBoundingBox.l - ourBoundingBox.r),
    ];

    var dir = 0, l = 4, min = distances[dir];
    for (var i = 1; i < l; i++) {
        if (distances[i] < min) {
            min = distances[i];
            dir = i;
        }
    }

    return dir;
}
