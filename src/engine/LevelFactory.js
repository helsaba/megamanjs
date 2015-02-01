Engine.scenes.Level.Util = {
    'createFromXML': function(xml, baseUrl)
    {
        var baseUrl = baseUrl || '';

        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, "application/xml");

        var jXml = $(jQuery.parseXML(xml));

        var levelXml = jXml.children('level');

        var level = new Engine.scenes.Level();
        level.animators = [];

        var spriteIndex = {};
        var objectIndex = {};
        var animationIndex = {};

        function expandRange(input, total)
        {
            var values = [];
            var groups, group, ranges, range, mod, upper, lower, i;

            groups = input.split(',');

            while (group = groups.shift()) {

                mod = parseFloat(group.split('/')[1]) || 1;
                ranges = group.split('-');

                if (ranges.length == 2) {
                    lower = parseFloat(ranges[0]);
                    upper = parseFloat(ranges[1]);
                }
                else if (ranges[0] == '*') {
                    lower = 1;
                    upper = total;
                }
                else {
                    lower = parseFloat(ranges[0]);
                    upper = lower;
                }

                i = 0;
                while (lower <= upper) {
                    if (i++ % mod === 0) {
                        values.push(lower);
                    }
                    lower++
                }
            }

            return values;
        }

        function getObject(ref)
        {
            if (!objectIndex[ref]) {
                throw new Error("No object reference '" + ref + "'");
            }
            return objectIndex[ref];
        }

        function getSprite(ref)
        {
            if (!spriteIndex[ref]) {
                throw new Error("No sprite '" + ref + "'");
            }
            return spriteIndex[ref];
        }

        function createObjects() {
            jXml.find('level > sprites').each(function(i, sprites) {
                sprites = $(sprites);

                var url = baseUrl + '/' + sprites.attr('url');
                var size = {
                    'w': parseFloat(sprites.attr('w')),
                    'h': parseFloat(sprites.attr('h')),
                };

                var texture = Engine.Util.getTexture(url);
                sprites.children('sprite').each(function(i, sprite) {
                    sprite = $(sprite);
                    var bounds = {
                        'x': parseFloat(sprite.attr('x')),
                        'y': parseFloat(sprite.attr('y')),
                        'w': parseFloat(sprite.attr('w')),
                        'h': parseFloat(sprite.attr('h')),
                    };

                    var uvMap = Engine.Util.createUVMap(bounds.x, bounds.y, bounds.w, bounds.h, size.w, size.h);
                    spriteIndex[sprite.attr('id')] = {
                        'uvMap': uvMap,
                        'texture': texture,
                    }
                });

                sprites.children('animation').each(function(i, anim) {
                    anim = $(anim);
                    var timeline = new Engine.Timeline();
                    timeline.name = anim.attr('name');
                    anim.children('frame').each(function(i, frame) {
                        frame = $(frame);
                        timeline.addFrame(getSprite(frame.attr('sprite')).uvMap, parseFloat(frame.attr('duration')));
                    });
                    level.addTimeline(timeline);
                    animationIndex[anim.attr('name')] = timeline;
                });


                jXml.find('objects > object').each(function(i, object) {
                    object = $(object);
                    var objectId = object.attr('id');
                    var size = {
                        'w': parseFloat(object.attr('w')),
                        'h': parseFloat(object.attr('h')),
                        'wseg': parseFloat(object.attr('segments-w')) || 1,
                        'hseg': parseFloat(object.attr('segments-h')) || 1,
                    };

                    var geometry = new THREE.PlaneGeometry(size.w, size.h, size.wseg, size.hseg);
            /*
            <object id="triple-block-vert-2" w="16" h="32" segments-h="2">
                <animation ref="v-block-n" offset="0" />
                <animation ref="v-block-s" offset="0" />
            </object>*/
                    object.children().each(function(i, face) {
                        face = $(face);
                        var ref = face.attr('ref');
                        if (face.is('animation')) {
                            var offset = parseFloat(face.attr('offset')) || 0;
                            var animator = new Engine.UVAnimator(animationIndex[ref], geometry, i, offset);
                        }
                        else if (face.is('sprite')) {
                            geometry.faceVertexUvs[i] = getSprite(ref).uvMap;
                        }
                        else if (face.is('empty')) {

                        }
                        else {
                            throw new Error('Unsupported face ' + face[0].localName);
                        }
                    });

                    objectIndex[objectId] = {
                        'size': size,
                        'geometry': geometry,
                        'texture': texture
                    };
                });
            });
        }

        createObjects();

        var layoutXml = levelXml.children('layout');


        var backgroundGeometry = new THREE.Geometry();
        layoutXml.find('background').each(function(i, backgroundXml) {
            backgroundXml = $(backgroundXml);
            var prop = {
                'x': parseFloat(backgroundXml.attr('x')),
                'y': parseFloat(backgroundXml.attr('y')),
                'w': parseFloat(backgroundXml.attr('w')),
                'h': parseFloat(backgroundXml.attr('h')),
                'wx': parseFloat(backgroundXml.attr('w-segments')),
                'hx': parseFloat(backgroundXml.attr('h-segments')),
            };
            var geometry = new THREE.PlaneGeometry(prop.w, prop.h, prop.wx, prop.hx);
            var material;
            backgroundXml.find('sprite').each(function(i, spriteXml) {
                spriteXml = $(spriteXml);
                var ref = spriteXml.attr('ref');
                var texture = getSprite(ref).texture;
                material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.FrontSide,
                });
                var uvMap = getSprite(ref).uvMap;

                spriteXml.find('segment').each(function(i, segmentXml) {
                    segmentXml = $(segmentXml);
                    var range = {
                        'x': expandRange(segmentXml.attr('x'), prop.wx),
                        'y': expandRange(segmentXml.attr('y'), prop.hx),
                    };

                    var i, j, x, y, faceIndex;
                    for (i in range.x) {
                        x = range.x[i] - 1;
                        for (j in range.y) {
                            y = range.y[j] - 1;
                            faceIndex = (x + (y * prop.wx)) * 2;
                            geometry.faceVertexUvs[0][faceIndex] = uvMap[0];
                            geometry.faceVertexUvs[0][faceIndex+1] = uvMap[1];
                        }
                    }
                });
            });
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = prop.x + (prop.w / 2);
            mesh.position.y = -(prop.y + (prop.h / 2));
            mesh.position.z = 0;

            level.scene.add(mesh);
        });

        /* FOR MERGING
        //var levelGeometry = new THREE.Geometry();
            //mesh.updateMatrix();
            //levelGeometry.merge(mesh.geometry, mesh.matrix);
        //var levelMesh = new THREE.Mesh(levelGeometry, new THREE.MeshFaceMaterial(materials));
        //level.scene.add(levelMesh);
        */

        layoutXml.find('objects > object').each(function(i, objectXml) {
            objectXml = $(objectXml);

            var ref = objectXml.attr('ref');
            var object = getObject(ref);

            var material = new THREE.MeshBasicMaterial();
            material.map = object.texture;
            material.side = THREE.DoubleSide;

            //materials.push(spriteIndex[id].material);
            var rangeX = expandRange(objectXml.attr('x'));
            var rangeY = expandRange(objectXml.attr('y'));

            for (var i in rangeX) {
                var mesh = new THREE.Mesh(object.geometry, material);
                mesh.position.x = rangeX[i] + (object.size.w / 2);
                mesh.position.y = -(rangeY[i] + (object.size.h / 2));
                level.scene.add(mesh);
            }

            var rotate = parseFloat(objectXml.attr('rotate'));
            if (isFinite(rotate)) {
                mesh.rotation.z = -(Math.PI/180)*rotate;
            }

            var flip = objectXml.attr('flip');
            if (flip == 'x') {
                mesh.scale.x = -1;
            }
            if (flip == 'y') {
                mesh.scale.y = -1;
            }
        });

        var layoutNodes = doc.evaluate('/level/layout/objects/object', doc, null, XPathResult.ANY_TYPE , null);
        //var materials = [];
        var objectNode;
        while (objectNode = layoutNodes.iterateNext()) {
            var ref = objectNode.attributes['ref'].value;
            var object = getObject(ref);

            var material = new THREE.MeshBasicMaterial();
            material.map = object.texture;

            var mesh = new THREE.Mesh(object.geometry, material);
            //materials.push(spriteIndex[id].material);
            var pos = {
                'x': parseFloat(objectNode.attributes['x'].value),
                'y': parseFloat(objectNode.attributes['y'].value)
            };

            mesh.position.x = pos.x + (object.size.w / 2);
            mesh.position.y = -(pos.y + (object.size.h / 2));

            var rotate = doc.evaluate('@rotate', objectNode, null, XPathResult.NUMBER_TYPE, null).numberValue;
            var flip = doc.evaluate('@flip', objectNode, null, XPathResult.STRING_TYPE, null).stringValue;
            if (isFinite(rotate)) {
                mesh.rotation.z = -(Math.PI/180)*rotate;
            }
            if (flip == 'x') {
                mesh.scale.x = -1;
            }
            if (flip == 'y') {
                mesh.scale.y = -1;
            }

            level.scene.add(mesh);
        }

        var itemNodes = doc.evaluate('/level/layout//item', doc, null, XPathResult.ANY_TYPE , null);
        var itemNode;
        while (itemNode = itemNodes.iterateNext()) {
            var name = itemNode.attributes['name'].value;
            if (!Engine.assets.objects.items[name]) {
                throw new Error('Item ' + name + ' does not exist');
            }
            var Item = new Engine.assets.objects.items[name]();
            Item.model.position.x = parseFloat(itemNode.attributes['x'].value);
            Item.model.position.y = -parseFloat(itemNode.attributes['y'].value);
            level.addObject(Item);
        }

        layoutXml.find('obstacles > obstacle').each(function(i, obstacleXml) {
            obstacleXml = $(obstacleXml);
            var name = obstacleXml.attr('name');
            if (!Engine.assets.obstacles[name]) {
                throw new Error('Obstacle ' + name + ' does not exist');
            }
            var Obstacle = new Engine.assets.obstacles[name](obstacleXml.attr('color'));
            Obstacle.model.position.x = parseFloat(obstacleXml.attr('x'));
            Obstacle.model.position.y = -parseFloat(obstacleXml.attr('y'));
            level.addObject(Obstacle);
        });

        var exposeSolids = false;
        var solidNodes = doc.evaluate('/level/layout/solids/*', doc, null, XPathResult.ANY_TYPE , null);
        var solidNode;
        var material = new THREE.MeshBasicMaterial({
            color: 'white',
            wireframe: true,
            visible: exposeSolids,
        });

        while (solidNode = solidNodes.iterateNext()) {
            var prop = {
                'x': parseFloat(solidNode.attributes['x'].value),
                'y': parseFloat(solidNode.attributes['y'].value),
                'w': parseFloat(solidNode.attributes['w'].value),
                'h': parseFloat(solidNode.attributes['h'].value),
            }

            var geometry = new THREE.PlaneGeometry(prop.w, prop.h);
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = prop.x + (prop.w / 2);
            mesh.position.y = -(prop.y + (prop.h / 2));
            mesh.position.z = exposeSolids ? 1 : -1;

            var solid = new Engine.assets.Solid();
            solid.setModel(mesh);
            solid.addCollisionGeometry(geometry);

            level.addObject(solid);
        }

        var checkpoint = doc.evaluate('/level/checkpoints/checkpoint[1]', doc, null, XPathResult.ANY_TYPE , null).iterateNext();
        if (checkpoint) {
            var x = doc.evaluate('@x', checkpoint, null, XPathResult.NUMBER_TYPE, null).numberValue;
            var y = doc.evaluate('@y', checkpoint, null, XPathResult.NUMBER_TYPE, null).numberValue;
            level.setStartPosition(x, y);
        }

        return level;
    },
    'loadFromXML': function(url, callback)
    {
        var baseUrl = url.split('/').slice(0, -1).join('/');
        xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function()
        {
            switch(this.readyState) {
                case 4:
                    var level = Engine.scenes.Level.Util.createFromXML(this.responseText, baseUrl);
                    callback(level);
                    break;
            }
        };
        xmlhttp.overrideMimeType('text/xml');
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }
};
