var Hud = function(screen)
{
	screen = $(screen);

	this.elements = {
		'healthBar': screen.find('.health'),
		'weaponBar': screen.find('.weapon'),
		'bossHealthBar': screen.find('.bossHealth'),
	};

	var character = undefined;
	var weapon = undefined;
	var boss = undefined;

	var hud = this;
	function healthChanged() {
		hud.setHealthEnergy(this.health.fraction);
	}
	function ammoChanged() {
		hud.setWeaponEnergy(this.ammo.fraction);
	}
	function bossHealthChanged() {
		hud.setBossHealthEnergy(this.health.fraction);
	}

	this.equipCharacter = function(newChar)
	{
		if (character) {
			character.unbind(character.health.EVENT_HEALTH_CHANGED, healthChanged);
		}
		character = newChar;
		this.setHealthEnergy(character.health.fraction);
		character.bind(character.health.EVENT_HEALTH_CHANGED, healthChanged);
	}

	this.equipWeapon = function(newWeapon)
	{
		if (weapon) {
			weapon.ammo.event = function(){};
			this.elements.weaponBar.removeClass(weapon.code);
		}
		weapon = newWeapon;
		this.elements.weaponBar.addClass(weapon.code);
		this.setWeaponEnergy(weapon.ammo.fraction);
		weapon.bind(weapon.EVENT_AMMO_CHANGED, ammoChanged);
	}

	this.equipBoss = function(newChar)
	{
		if (boss) {
			boss.unbind(boss.health.EVENT_HEALTH_CHANGED, healthChanged);
		}
		boss = newChar;
		this.setHealthEnergy(boss.health.fraction);
		boss.bind(boss.health.EVENT_HEALTH_CHANGED, bossHealthChanged);
	}

	this.setHealthEnergy = function(frac)
	{
		setEnergyQuantified(this.elements.healthBar, frac);
	}

	this.setWeaponEnergy = function(frac)
	{
		setEnergyQuantified(this.elements.weaponBar, frac);
	}

	this.setWeaponEnergy = function(frac)
	{
		setEnergyQuantified(this.elements.bossHealthBar, frac);
	}

	function setEnergyQuantified(element, frac)
	{
		// Quantify to whole 1/28th increments (full energy bar).
		var s = 1/27;
		var q = frac - (frac % s);
		if (frac > 0 && q == 0) {
			q = s;
		}
		element.children('.amount').css('height', (q * 100) + '%');
		return q;
	}
}
