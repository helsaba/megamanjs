Engine.Animator = function()
{
    this._currentAnimation = undefined;
    this._currentGroup = undefined;
    this._currentId = undefined;
    this._currentIndex = undefined;

    this.animations = {};
    this.offset = 0;
    this.time = 0;
}

Engine.Animator.prototype.addAnimation = function(id, animation, group)
{
    if (this.animations[id]) {
        throw new TypeError('Animation "' + id + '" already defined');
    }
    this.animations[id] = {
        animation: animation,
        group: group,
    };
}

Engine.Animator.prototype.copy = function(animator)
{
    this._currentAnimation = animator._currentAnimation;
    this._currentId = animator._currentId;
    this.animations = animator.animations;
}

Engine.Animator.prototype.createAnimation = function(id, group)
{
    var animation = new Engine.Animator.Animation();
    this.addAnimation(id, animation, group);
    return animation;
}

Engine.Animator.prototype.pickAnimation = function(id)
{
    if (this._currentId === id) {
        return;
    }
    if (!this.animations[id]) {
        throw new Error('Animation "' + id + '" not defined');
    }

    var animation = this.animations[id];

    if (animation.group === undefined || animation.group !== this._currentGroup) {
        this.reset();
    }

    this.setAnimation(animation.animation);
    this._currentId = id;
    this._currentGroup = animation.group;
}

Engine.Animator.prototype.reset = function()
{
    this.time = this.offset;
}

Engine.Animator.prototype.setAnimation = function(animation)
{
    if (animation !== this._currentAnimation) {
        this._currentIndex = undefined;
        this._currentAnimation = animation;
    }
}

/**
 * Runs through all geometries and faces and updates their UV maps
 * if frames has changed between previous and previous + deltaTime.
 *
 * @param {Number} [deltaTime]
 */
Engine.Animator.prototype.update = function(deltaTime)
{
    this.time += deltaTime || 0;
    this._applyAnimation(this._currentAnimation);
}

/**
 * Runs through all geometries and faces and updates their UV maps
 * regardless of what their previous value was.
 *
 * @param {Number} [deltaTime]
 */
Engine.Animator.prototype.updateForce = function(deltaTime)
{
    this._currentIndex = undefined;
    this.update(deltaTime);
}

Engine.Animator.Animation = function()
{
    this._value = undefined;
    this._duration = undefined;

    this.frames = 0;
    this.timeline = undefined;
}

Engine.Animator.Animation.prototype.addFrame = function(value, duration)
{
    /* If this is the first time addFrame is run,
       save the value and duration flat, since we
       will not need the Timeline class to resolve it. */
    if (this._value === undefined) {
        this._value = value;
        this._duration = duration;
    }
    /* If addFrame is run more than once, create Timeline
       object, copy static frame to Timeline and tranform
       behavior to a multi frame Animation. */
    else {
        this.timeline = new Engine.Timeline();
        this.addFrame = this.timeline.addFrame.bind(this.timeline);
        this.getIndex = this.timeline.getIndexAtTime.bind(this.timeline);
        this.getValue = this.timeline.getValueAtIndex.bind(this.timeline);
        this.addFrame(this._value, this._duration);
        this.addFrame(value, duration);

        this._value = undefined;
        this._duration = undefined;
    }

    ++this.frames;
}

Engine.Animator.Animation.prototype.getIndex = function()
{
    return 0;
}

Engine.Animator.Animation.prototype.getValue = function()
{
    return this._value;
}
