-- Données Atlas Auto exportées depuis la base locale.
-- À appliquer APRÈS 0001_schema.sql.

-- employes (1)
DELETE FROM employes;
-- Le code ci-dessous est neutralise ('00000') : ce fichier part sur GitHub.
-- La base en ligne garde le vrai code. Sur une base neuve, change-le dans Parametres.
INSERT INTO employes (id, nom, prenom, grade, code, actif, connexions, cree_le) VALUES (1, 'Petit', 'Clovis', 'Patron', '00000', 1, 22, '2026-09-11 16:05:35');

-- genres (11)
DELETE FROM genres;
INSERT INTO genres (id, nom) VALUES (1, 'Compacts');
INSERT INTO genres (id, nom) VALUES (2, 'Coupés');
INSERT INTO genres (id, nom) VALUES (3, 'Motos');
INSERT INTO genres (id, nom) VALUES (4, 'Muscle');
INSERT INTO genres (id, nom) VALUES (5, 'Tout-terrain');
INSERT INTO genres (id, nom) VALUES (6, 'Berlines');
INSERT INTO genres (id, nom) VALUES (7, 'Sportives');
INSERT INTO genres (id, nom) VALUES (8, 'Sports classiques');
INSERT INTO genres (id, nom) VALUES (9, 'Supercars');
INSERT INTO genres (id, nom) VALUES (10, 'SUV');
INSERT INTO genres (id, nom) VALUES (11, 'Vans');

-- catalogue (372)
DELETE FROM catalogue;
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (1, 'Weevil', 15000, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (2, 'Brioso 300', 10000, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (3, 'Club', 17500, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (4, 'Blista Kanjo', 22500, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (5, 'Asbo', 17500, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (6, 'Issi Classic', 12500, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (7, 'Rhapsody', 15000, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (8, 'Panto', 7500, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (9, 'Prairie', 16000, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (10, 'Dilettante', 17500, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (11, 'Blista', 15000, 'Compacts');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (12, 'FR36', 45000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (13, 'Postlude', 20000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (14, 'Kanjo SJ', 25000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (15, 'Previon', 30000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (16, 'Zion Cabrio', 37500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (17, 'Zion', 32500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (18, 'Windsor Drop', 85000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (19, 'Sentinel XS', 42500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (20, 'Sentinel', 47500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (21, 'Oracle XS', 35000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (22, 'Oracle', 32500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (23, 'Jackal', 30000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (24, 'Felon GT', 42500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (25, 'Felon', 37500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (26, 'F620', 37500, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (27, 'Exemplar', 45000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (28, 'Cognoscenti Cabrio', 50000, 'Coupés');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (29, 'Powersurge', 60000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (30, 'Reever', 65000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (31, 'Shinobi', 82500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (32, 'Stryder', 45000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (33, 'Sanchez', 7500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (34, 'Zombie Chopper', 32500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (35, 'Zombie Bobber', 30000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (36, 'Wolfsbane', 25000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (37, 'Vortex', 42500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (38, 'Vindicator', 40000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (39, 'Vader', 20000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (40, 'Thrust', 35000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (41, 'Sovereign', 37500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (42, 'Ruffian', 25000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (43, 'Rat Bike', 20000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (44, 'PCJ 600', 22500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (45, 'Nightblade', 37500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (46, 'Nemesis', 20000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (47, 'Manchez', 25000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (48, 'Lectro', 47500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (49, 'Innovation', 32500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (50, 'Hexer', 25000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (51, 'Hakuchou Drag', 75000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (52, 'Hakuchou', 55000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (53, 'Gargoyle', 40000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (54, 'FCR 1000 Custom', 45000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (55, 'FCR 1000', 32500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (56, 'Faggio Sport', 4500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (57, 'Faggio', 3000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (58, 'Esskey', 32500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (59, 'Enduro', 20000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (60, 'Double-T', 30000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (61, 'Diabolus Custom', 42500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (62, 'Diabolus', 32500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (63, 'Defiler', 40000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (64, 'Daemon', 30000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (65, 'Cliffhanger', 35000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (66, 'Chimera', 42500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (67, 'Carbon RS', 35000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (68, 'BF400', 27500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (69, 'Bati 801', 32500, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (70, 'Bagger', 25000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (71, 'Avarus', 30000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (72, 'Akuma', 30000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (73, 'Sanctus', 90000, 'Motos');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (74, 'Brigham', 52500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (75, 'Buffalo EVX', 102500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (76, 'Clique Wagon', 47500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (77, 'Vigero ZX', 87500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (78, 'Ruiner ZZ-8', 68750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (79, 'Greenwood', 47500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (80, 'Buffalo STX', 93750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (81, 'Dominator GTT', 56250, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (82, 'Dominator ASP', 72500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (83, 'Manana Custom', 40000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (84, 'Gauntlet Classic Custom', 58750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (85, 'Beater Dukes', 21250, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (86, 'Drift Yosemite', 68750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (87, 'Peyote Gasser', 52500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (88, 'Gauntlet Hellfire', 75000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (89, 'Gauntlet Classic', 43750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (90, 'Vamos', 37500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (91, 'Deviant', 50000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (92, 'Tulip', 40000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (93, 'Clique', 52500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (94, 'Impaler', 35000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (95, 'Dominator GTX', 56250, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (96, 'Ellie', 47500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (97, 'Sabre Turbo Custom', 43750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (98, 'Faction Custom', 37500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (99, 'Vigero', 22500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (100, 'Gauntlet', 31250, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (101, 'Buccaneer', 27500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (102, 'Hustler', 50000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (103, 'Yosemite', 37500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (104, 'Hermes', 43750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (105, 'Voodoo Custom', 35000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (106, 'Voodoo', 12500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (107, 'Virgo Classic Custom', 35000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (108, 'Virgo Classic', 22500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (109, 'Virgo', 25000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (110, 'Tampa', 30000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (111, 'Stallion', 27500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (112, 'Slamvan', 22500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (113, 'Sabre Turbo', 20000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (114, 'Ruiner', 27500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (115, 'Pisswasser Dominator', 37500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (116, 'Picador', 15000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (117, 'Phoenix', 25000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (118, 'Nightshade', 52500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (119, 'Moonbeam Custom', 35000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (120, 'Moonbeam', 18750, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (121, 'Lurcher', 56250, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (122, 'Faction Custom Donk', 50000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (123, 'Faction', 20000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (124, 'Dukes', 27500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (125, 'Dominator', 32500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (126, 'Coquette BlackFin', 60000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (127, 'Chino Custom', 35000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (128, 'Chino', 27500, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (129, 'Buccaneer Custom', 40000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (130, 'Blade', 25000, 'Muscle');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (131, 'Walton L35', 47500, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (132, 'MonstroCiti', 70000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (133, 'Yosemite Rancher', 42500, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (134, 'Outlaw', 47500, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (135, 'Everon', 60000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (136, 'Vagrant', 80000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (137, 'Hellion', 42500, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (138, 'Caracara 4x4', 55000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (139, 'Sandking SWB', 30000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (140, 'Street Blazer', 15000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (141, 'Sandking XL', 35000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (142, 'Rebel', 20000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (143, 'Rancher XL', 22500, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (144, 'Merryweather Mesa', 32500, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (145, 'Kalahari', 17500, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (146, 'Bodhi', 20000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (147, 'Blazer', 10000, 'Tout-terrain');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (148, 'Rhinehart', 90625, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (149, 'Cinquemila', 100000, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (150, 'Warrener HKR', 46875, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (151, 'Tailgater S', 78125, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (152, 'Glendale Custom', 43750, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (153, 'Stafford', 87500, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (154, 'Romero Hearse', 56250, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (155, 'Washington', 31250, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (156, 'Warrener', 28125, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (157, 'Tailgater', 40625, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (158, 'Surge', 31250, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (159, 'Super Diamond', 87500, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (160, 'Stretch', 68750, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (161, 'Stratum', 25000, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (162, 'Stanier', 28125, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (163, 'Schafter', 46875, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (164, 'Regina', 18750, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (165, 'Primo Custom', 40625, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (166, 'Primo', 21875, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (167, 'Premier', 18750, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (168, 'Intruder', 28125, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (169, 'Ingot', 21875, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (170, 'Glendale', 25000, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (171, 'Fugitive', 31250, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (172, 'Emperor', 15625, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (173, 'Cognoscenti 55', 75000, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (174, 'Cognoscenti', 81250, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (175, 'Asterope', 25000, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (176, 'Asea', 15625, 'Berlines');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (177, 'Itali GTO Stinger TT', 189000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (178, 'Sentinel Classic Widebody', 84000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (179, '10F Widebody', 183750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (180, '10F', 162750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (181, 'SM722', 178500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (182, 'Corsita', 173250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (183, 'Comet S2 Cabrio', 168000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (184, 'Cypher', 78750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (185, 'Sultan RS Classic', 94500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (186, 'ZR350', 78750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (187, 'Remus', 68250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (188, 'RT3000', 68250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (189, 'Jester RR', 99750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (190, 'Futo GTX', 57750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (191, 'Euros', 84000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (192, 'Calico GTF', 89250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (193, 'Growler', 115500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (194, 'Vectre', 94500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (195, 'Comet S2', 157500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (196, 'Itali RSX', 199500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (197, 'Penumbra FF', 57750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (198, 'Coquette D10', 152250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (199, 'Sugoi', 63000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (200, 'V-STR', 110250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (201, 'Sultan Classic', 73500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (202, 'Imorgon', 131250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (203, 'Komoda', 105000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (204, 'Jugular', 110250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (205, 'Locust', 115500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (206, 'Neo', 152250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (207, 'Paragon R', 120750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (208, '8F Drafter', 94500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (209, 'Schlagen GT', 141750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (210, 'Itali GTO', 157500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (211, 'Jester Classic', 68250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (212, 'Flash GT', 78750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (213, 'Surano', 73500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (214, 'Comet', 63000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (215, 'Alpha', 57750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (216, 'Comet SR', 131250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (217, 'Neon', 126000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (218, 'Sentinel Classic', 57750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (219, 'Raiden', 115500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (220, 'Pariah', 152250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (221, 'Verlierer', 78750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (222, 'Tropos Rallye', 63000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (223, 'Sultan', 36750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (224, 'Specter', 84000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (225, 'Seven-70', 99750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (226, 'Schwartzer', 47250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (227, 'Schafter V12', 63000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (228, 'Schafter LWB', 63000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (229, 'Ruston', 78750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (230, 'Rapid GT Cabrio', 73500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (231, 'Rapid GT', 68250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (232, 'Penumbra', 31500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (233, 'Massacro', 94500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (234, 'Kuruma', 47250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (235, 'Khamelion', 57750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (236, 'Jester', 84000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (237, 'Futo', 26250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (238, 'Fusilade', 36750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (239, 'Furore GT', 78750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (240, 'Feltzer', 68250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (241, 'Elegy RH8', 52500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (242, 'Coquette', 63000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (243, 'Carbonizzare', 89250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (244, 'Buffalo S', 47250, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (245, 'Buffalo', 31500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (246, 'Blista Compact', 23625, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (247, 'Bestia GTS', 94500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (248, 'Banshee', 73500, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (249, '9F Cabrio', 84000, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (250, '9F', 78750, 'Sportives');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (251, 'Peyote Custom', 47250, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (252, 'Retinue Mk II', 68250, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (253, 'Dynasty', 31500, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (254, 'Zion Classic', 57750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (255, 'Nebula Turbo', 36750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (256, 'Swinger', 131250, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (257, 'Michelli GT', 44625, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (258, 'Cheburek', 23625, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (259, 'Fagaloa', 28875, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (260, '190z', 99750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (261, 'GT500', 94500, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (262, 'Retinue', 42000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (263, 'Rapid GT Classic', 89250, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (264, 'Torero', 141750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (265, 'Cheetah Classic', 162750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (266, 'Z-Type', 189000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (267, 'Turismo Classic', 157500, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (268, 'Tornado Custom', 36750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (269, 'Tornado Cabrio', 31500, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (270, 'Tornado', 21000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (271, 'Stinger GT', 152250, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (272, 'Stinger', 141750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (273, 'Roosevelt Valor', 105000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (274, 'Roosevelt', 94500, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (275, 'Pigalle', 42000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (276, 'Peyote', 26250, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (277, 'Monroe', 126000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (278, 'Manana', 21000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (279, 'Mamba', 115500, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (280, 'Infernus Classic', 168000, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (281, 'Coquette Classic', 99750, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (282, 'Casco', 89250, 'Sports classiques');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (283, 'Torero XO', 350000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (284, 'Zeno', 345000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (285, 'Ignus', 340000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (286, 'Tigon', 310000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (287, 'Furia', 320000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (288, 'Zorrusso', 270000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (289, 'Krieger', 350000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (290, 'Emerus', 345000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (291, 'Thrax', 315000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (292, 'Deveste Eight', 330000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (293, 'Tyrant', 305000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (294, 'Tezeract', 335000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (295, 'Taipan', 290000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (296, 'Entity XXR', 300000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (297, 'Banshee 900R', 150000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (298, 'SC1', 220000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (299, 'Autarch', 285000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (300, 'Cyclone', 255000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (301, 'Visione', 295000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (302, 'XA-21', 265000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (303, 'Vagner', 280000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (304, 'Zentorno', 230000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (305, 'X80 Proto', 325000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (306, 'Voltic', 130000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (307, 'Vacca', 145000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (308, 'Turismo R', 155000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (309, 'Tempesta', 220000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (310, 'T20', 245000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (311, 'Sultan RS', 125000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (312, 'Reaper', 235000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (313, 'Penetrator', 190000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (314, 'Osiris', 240000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (315, 'Nero Custom', 270000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (316, 'Nero', 245000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (317, 'Itali GTB Custom', 260000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (318, 'Itali GTB', 235000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (319, 'Infernus', 155000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (320, 'GP1', 210000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (321, 'FMJ', 230000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (322, 'ETR1', 220000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (323, 'Entity XF', 175000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (324, 'Cheetah', 170000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (325, 'Bullet', 140000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (326, 'Adder', 195000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (327, '811', 205000, 'Supercars');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (328, 'I-Wagen', 95000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (329, 'Baller ST', 90000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (330, 'Astron', 110000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (331, 'Seminole Frontier', 45000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (332, 'Landstalker XL', 65000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (333, 'Rebla GTS', 105000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (334, 'Novak', 85000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (335, 'Toros', 100000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (336, 'Patriot Stretch', 70000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (337, 'Serrano', 32500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (338, 'Patriot', 35000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (339, 'Habanero', 27500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (340, 'FQ2', 25000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (341, 'BeeJay XL', 22500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (342, 'XLS', 55000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (343, 'Seminole', 22500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (344, 'Rocoto', 40000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (345, 'Radius', 25000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (346, 'Mesa', 27500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (347, 'Landstalker', 30000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (348, 'Huntley S', 60000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (349, 'Gresley', 25000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (350, 'Granger', 32500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (351, 'Dubsta 2', 52500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (352, 'Dubsta', 42500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (353, 'Contender', 50000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (354, 'Cavalcade', 35000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (355, 'Baller LE LWB', 65000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (356, 'Baller LE', 57500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (357, 'Baller (Old)', 30000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (358, 'Bobcat XL', 27500, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (359, 'Bison', 35000, 'SUV');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (360, 'Youga Classic 4x4', 55000, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (361, 'Bugstars Burrito', 27500, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (362, 'Youga Classic', 32500, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (363, 'Youga', 20000, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (364, 'Surfer', 17500, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (365, 'Speedo', 22500, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (366, 'Rumpo Custom', 45000, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (367, 'Rumpo', 25000, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (368, 'Pony', 20000, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (369, 'Paradise', 25000, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (370, 'Minivan Custom', 37500, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (371, 'Minivan', 20000, 'Vans');
INSERT INTO catalogue (id, nom, prix_base, genre) VALUES (372, 'Burrito', 22500, 'Vans');

-- contrats_modeles (2)
DELETE FROM contrats_modeles;
INSERT INTO contrats_modeles (id, nom, categorie, corps, a_trous, visible_par, cree_le) VALUES (1, 'Contrat de vente', 'vente', 'CONTRAT DE VENTE — {{numero}}
{{entreprise}} — le {{date}}

LE VENDEUR
{{entreprise}}, représentée par {{employe_prenom}} {{employe_nom}} ({{employe_grade}}).

L''ACHETEUR
{{client_prenom}} {{client_nom}} — citoyen de classe {{client_classe}}.

VÉHICULE
Modèle : {{vehicule}} ({{genre}})
Prix de vente : {{prix}}

Le véhicule est cédé en l''état. L''acheteur reconnaît en avoir pris possession
et s''être acquitté de la totalité du montant. Le présent contrat vaut preuve
d''achat et de propriété.

Fait à Los Santos, le {{date}}.

Le vendeur — {{employe_prenom}} {{employe_nom}}, pour {{entreprise}}
L''acheteur — {{client_prenom}} {{client_nom}} (classe {{client_classe}})', 1, '', '2026-09-11 16:05:35');
INSERT INTO contrats_modeles (id, nom, categorie, corps, a_trous, visible_par, cree_le) VALUES (2, 'Contrat de rachat', 'achat', 'CONTRAT DE RACHAT — {{numero}}
{{entreprise}} — le {{date}}

LE VENDEUR
{{client_prenom}} {{client_nom}} — citoyen de classe {{client_classe}}.

L''ACHETEUR
{{entreprise}}, représentée par {{employe_prenom}} {{employe_nom}} ({{employe_grade}}).

VÉHICULE
Modèle : {{vehicule}} ({{genre}})
Montant versé au vendeur : {{prix}}

Le vendeur déclare être le propriétaire légitime du véhicule et le céder libre
de toute dette et de tout litige. {{entreprise}} en devient propriétaire à
compter de la signature, et le montant ci-dessus lui a été intégralement versé.

Fait à Los Santos, le {{date}}.

Le vendeur — {{client_prenom}} {{client_nom}} (classe {{client_classe}})
L''acheteur — {{employe_prenom}} {{employe_nom}}, pour {{entreprise}}', 1, '', '2026-09-11 16:05:35');

-- parametres (3)
DELETE FROM parametres;
INSERT INTO parametres (cle, valeur) VALUES ('reductionMaxVente', '15');
INSERT INTO parametres (cle, valeur) VALUES ('kmIntervalle', '10000');
INSERT INTO parametres (cle, valeur) VALUES ('kmMontant', '500');

-- tranches_reduction (4)
DELETE FROM tranches_reduction;
INSERT INTO tranches_reduction (id, seuil, montant) VALUES (5, 0, 2000);
INSERT INTO tranches_reduction (id, seuil, montant) VALUES (6, 15000, 5000);
INSERT INTO tranches_reduction (id, seuil, montant) VALUES (7, 50000, 15000);
INSERT INTO tranches_reduction (id, seuil, montant) VALUES (8, 150000, 40000);

-- tranches_marge (4)
DELETE FROM tranches_marge;
INSERT INTO tranches_marge (id, seuil, montant) VALUES (5, 0, 1000);
INSERT INTO tranches_marge (id, seuil, montant) VALUES (6, 15000, 2500);
INSERT INTO tranches_marge (id, seuil, montant) VALUES (7, 50000, 6000);
INSERT INTO tranches_marge (id, seuil, montant) VALUES (8, 150000, 15000);

-- compteurs (1)
DELETE FROM compteurs;
INSERT INTO compteurs (cle, valeur) VALUES ('contrat-2026', 6);
