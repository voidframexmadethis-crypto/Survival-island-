/**
 * Master global wildlife roster.
 *
 * This table is deliberately data-only. The runtime turns each row into a
 * pooled, instanced agent, so adding another species never means adding another
 * hand-authored mesh or draw call. Species that already exist as interactive
 * CreatureManager animals are not repeated here; those keep their bespoke AI,
 * combat, taming and harvesting behaviour.
 */

export type WildlifeRegion =
  | 'north_america'
  | 'arctic'
  | 'south_america'
  | 'europe'
  | 'africa'
  | 'asia'
  | 'australia'
  | 'antarctica'
  | 'urban'
  | 'ocean';

export type WildlifeCategory =
  | 'passive'
  | 'neutral'
  | 'aggressive'
  | 'aerial'
  | 'aquatic'
  | 'urban';

export type WildlifeArchetype =
  | 'quadruped'
  | 'ungulate'
  | 'primate'
  | 'bird'
  | 'raptor'
  | 'waterbird'
  | 'penguin'
  | 'serpent'
  | 'lizard'
  | 'crocodile'
  | 'turtle'
  | 'fish'
  | 'shark'
  | 'cetacean'
  | 'seal'
  | 'insect'
  | 'crab'
  | 'amphibian'
  | 'cephalopod'
  | 'benthic';

type RosterRow = readonly [
  id: string,
  name: string,
  region: WildlifeRegion,
  category: WildlifeCategory,
  archetype: WildlifeArchetype,
  scale: number,
];

const ROWS = [
  // ---------------------------------------------------------------------------
  // North America & Arctic
  // ---------------------------------------------------------------------------
  ['black_bear', 'Black Bear', 'north_america', 'aggressive', 'quadruped', 1.2],
  ['cougar', 'Cougar', 'north_america', 'aggressive', 'quadruped', 1.05],
  ['coyote', 'Coyote', 'north_america', 'neutral', 'quadruped', 0.72],
  ['bobcat', 'Bobcat', 'north_america', 'neutral', 'quadruped', 0.65],
  ['canadian_lynx', 'Canadian Lynx', 'north_america', 'neutral', 'quadruped', 0.7],
  ['elk', 'Elk', 'north_america', 'neutral', 'ungulate', 1.25],
  ['white_tailed_deer', 'White-tailed Deer', 'north_america', 'passive', 'ungulate', 1.0],
  ['pronghorn', 'Pronghorn', 'north_america', 'passive', 'ungulate', 0.95],
  ['bighorn_sheep', 'Bighorn Sheep', 'north_america', 'neutral', 'ungulate', 0.9],
  ['mountain_goat', 'Mountain Goat', 'north_america', 'neutral', 'ungulate', 0.82],
  ['beaver', 'Beaver', 'north_america', 'passive', 'quadruped', 0.55],
  ['river_otter', 'River Otter', 'north_america', 'passive', 'quadruped', 0.6],
  ['raccoon', 'Raccoon', 'north_america', 'passive', 'quadruped', 0.48],
  ['striped_skunk', 'Striped Skunk', 'north_america', 'neutral', 'quadruped', 0.42],
  ['virginia_opossum', 'Virginia Opossum', 'north_america', 'passive', 'quadruped', 0.45],
  ['wolverine', 'Wolverine', 'north_america', 'aggressive', 'quadruped', 0.68],
  ['american_badger', 'American Badger', 'north_america', 'neutral', 'quadruped', 0.5],
  ['porcupine', 'Porcupine', 'north_america', 'neutral', 'quadruped', 0.5],
  ['groundhog', 'Groundhog', 'north_america', 'passive', 'quadruped', 0.38],
  ['prairie_dog', 'Prairie Dog', 'north_america', 'passive', 'quadruped', 0.28],
  ['nine_banded_armadillo', 'Nine-banded Armadillo', 'north_america', 'passive', 'quadruped', 0.45],
  ['jackrabbit', 'Jackrabbit', 'north_america', 'passive', 'quadruped', 0.38],
  ['chipmunk', 'Chipmunk', 'north_america', 'passive', 'quadruped', 0.22],
  ['flying_squirrel', 'Flying Squirrel', 'north_america', 'passive', 'quadruped', 0.22],
  ['muskrat', 'Muskrat', 'north_america', 'passive', 'quadruped', 0.3],
  ['golden_eagle', 'Golden Eagle', 'north_america', 'aerial', 'raptor', 1.25],
  ['red_tailed_hawk', 'Red-tailed Hawk', 'north_america', 'aerial', 'raptor', 0.95],
  ['snowy_owl', 'Snowy Owl', 'arctic', 'aerial', 'raptor', 0.85],
  ['wild_turkey', 'Wild Turkey', 'north_america', 'passive', 'bird', 0.95],
  ['canada_goose', 'Canada Goose', 'arctic', 'aerial', 'waterbird', 0.85],
  ['mallard_duck', 'Mallard Duck', 'north_america', 'aerial', 'waterbird', 0.65],
  ['pelican', 'American White Pelican', 'north_america', 'aerial', 'waterbird', 1.25],
  ['atlantic_puffin', 'Atlantic Puffin', 'arctic', 'aerial', 'bird', 0.55],
  ['sandhill_crane', 'Sandhill Crane', 'north_america', 'aerial', 'waterbird', 1.2],
  ['roadrunner', 'Greater Roadrunner', 'north_america', 'passive', 'bird', 0.65],
  ['blue_jay', 'Blue Jay', 'north_america', 'aerial', 'bird', 0.5],
  ['northern_cardinal', 'Northern Cardinal', 'north_america', 'aerial', 'bird', 0.45],
  ['hummingbird', 'Ruby-throated Hummingbird', 'north_america', 'aerial', 'bird', 0.26],
  ['pileated_woodpecker', 'Pileated Woodpecker', 'north_america', 'aerial', 'bird', 0.55],
  ['american_alligator', 'American Alligator', 'north_america', 'aggressive', 'crocodile', 1.2],
  ['cottonmouth', 'Cottonmouth', 'north_america', 'aggressive', 'serpent', 0.9],
  ['timber_rattlesnake', 'Timber Rattlesnake', 'north_america', 'aggressive', 'serpent', 0.8],
  ['coral_snake', 'Coral Snake', 'north_america', 'aggressive', 'serpent', 0.55],
  ['gila_monster', 'Gila Monster', 'north_america', 'neutral', 'lizard', 0.7],
  ['snapping_turtle', 'Snapping Turtle', 'north_america', 'neutral', 'turtle', 0.9],
  ['box_turtle', 'Eastern Box Turtle', 'north_america', 'passive', 'turtle', 0.5],
  ['bullfrog', 'American Bullfrog', 'north_america', 'passive', 'amphibian', 1.0],
  ['axolotl', 'Axolotl', 'north_america', 'passive', 'amphibian', 0.8],
  ['hellbender', 'Hellbender Salamander', 'north_america', 'passive', 'amphibian', 1.1],

  // ---------------------------------------------------------------------------
  // South America & Amazon Basin
  // ---------------------------------------------------------------------------
  ['jaguar', 'Jaguar', 'south_america', 'aggressive', 'quadruped', 1.15],
  ['puma', 'Puma', 'south_america', 'aggressive', 'quadruped', 1.0],
  ['spectacled_bear', 'Spectacled Bear', 'south_america', 'neutral', 'quadruped', 1.15],
  ['capybara', 'Capybara', 'south_america', 'passive', 'quadruped', 0.85],
  ['giant_anteater', 'Giant Anteater', 'south_america', 'neutral', 'quadruped', 1.1],
  ['three_toed_sloth', 'Three-toed Sloth', 'south_america', 'passive', 'primate', 0.75],
  ['two_toed_sloth', 'Two-toed Sloth', 'south_america', 'passive', 'primate', 0.8],
  ['giant_armadillo', 'Giant Armadillo', 'south_america', 'passive', 'quadruped', 0.8],
  ['llama', 'Llama', 'south_america', 'neutral', 'ungulate', 1.05],
  ['alpaca', 'Alpaca', 'south_america', 'passive', 'ungulate', 0.95],
  ['vicuna', 'Vicuña', 'south_america', 'passive', 'ungulate', 0.82],
  ['guanaco', 'Guanaco', 'south_america', 'passive', 'ungulate', 0.95],
  ['baird_tapir', 'Baird’s Tapir', 'south_america', 'neutral', 'ungulate', 1.05],
  ['maned_wolf', 'Maned Wolf', 'south_america', 'neutral', 'quadruped', 0.85],
  ['bush_dog', 'Bush Dog', 'south_america', 'neutral', 'quadruped', 0.5],
  ['coati', 'Coati', 'south_america', 'passive', 'quadruped', 0.45],
  ['kinkajou', 'Kinkajou', 'south_america', 'passive', 'quadruped', 0.38],
  ['howler_monkey', 'Howler Monkey', 'south_america', 'neutral', 'primate', 0.95],
  ['spider_monkey', 'Spider Monkey', 'south_america', 'passive', 'primate', 0.85],
  ['capuchin_monkey', 'Capuchin Monkey', 'south_america', 'passive', 'primate', 0.62],
  ['squirrel_monkey', 'Squirrel Monkey', 'south_america', 'passive', 'primate', 0.5],
  ['golden_lion_tamarin', 'Golden Lion Tamarin', 'south_america', 'passive', 'primate', 0.42],
  ['chinchilla', 'Chinchilla', 'south_america', 'passive', 'quadruped', 0.25],
  ['pink_river_dolphin', 'Pink River Dolphin', 'south_america', 'aquatic', 'cetacean', 1.3],
  ['giant_otter', 'Giant Otter', 'south_america', 'aquatic', 'quadruped', 0.95],
  ['harpy_eagle', 'Harpy Eagle', 'south_america', 'aerial', 'raptor', 1.35],
  ['andean_condor', 'Andean Condor', 'south_america', 'aerial', 'raptor', 1.65],
  ['scarlet_macaw', 'Scarlet Macaw', 'south_america', 'aerial', 'bird', 0.85],
  ['hyacinth_macaw', 'Hyacinth Macaw', 'south_america', 'aerial', 'bird', 0.95],
  ['toco_toucan', 'Toco Toucan', 'south_america', 'aerial', 'bird', 0.8],
  ['rhea', 'Greater Rhea', 'south_america', 'passive', 'bird', 1.3],
  ['hoatzin', 'Hoatzin', 'south_america', 'aerial', 'bird', 0.65],
  ['quetzal', 'Resplendent Quetzal', 'south_america', 'aerial', 'bird', 0.48],
  ['green_anaconda', 'Green Anaconda', 'south_america', 'aggressive', 'serpent', 1.8],
  ['boa_constrictor', 'Boa Constrictor', 'south_america', 'neutral', 'serpent', 1.25],
  ['emerald_tree_boa', 'Emerald Tree Boa', 'south_america', 'neutral', 'serpent', 0.9],
  ['black_caiman', 'Black Caiman', 'south_america', 'aggressive', 'crocodile', 1.55],
  ['spectacled_caiman', 'Spectacled Caiman', 'south_america', 'aggressive', 'crocodile', 1.1],
  ['galapagos_tortoise', 'Galápagos Giant Tortoise', 'south_america', 'passive', 'turtle', 1.6],
  ['marine_iguana', 'Marine Iguana', 'south_america', 'passive', 'lizard', 0.95],
  ['green_iguana', 'Green Iguana', 'south_america', 'passive', 'lizard', 0.9],
  ['poison_dart_frog', 'Poison Dart Frog', 'south_america', 'neutral', 'amphibian', 0.7],
  ['cane_toad', 'Cane Toad', 'south_america', 'neutral', 'amphibian', 1.3],
  ['mata_mata_turtle', 'Mata Mata Turtle', 'south_america', 'passive', 'turtle', 0.75],

  // ---------------------------------------------------------------------------
  // Europe
  // ---------------------------------------------------------------------------
  ['european_brown_bear', 'European Brown Bear', 'europe', 'aggressive', 'quadruped', 1.25],
  ['eurasian_wolf', 'Eurasian Wolf', 'europe', 'aggressive', 'quadruped', 0.95],
  ['eurasian_lynx', 'Eurasian Lynx', 'europe', 'neutral', 'quadruped', 0.78],
  ['red_deer', 'Red Deer', 'europe', 'neutral', 'ungulate', 1.15],
  ['fallow_deer', 'Fallow Deer', 'europe', 'passive', 'ungulate', 1.05],
  ['roe_deer', 'Roe Deer', 'europe', 'passive', 'ungulate', 0.85],
  ['european_bison', 'European Bison', 'europe', 'neutral', 'ungulate', 1.25],
  ['alpine_ibex', 'Alpine Ibex', 'europe', 'neutral', 'ungulate', 0.95],
  ['chamois', 'Chamois', 'europe', 'passive', 'ungulate', 0.8],
  ['mouflon', 'Mouflon', 'europe', 'neutral', 'ungulate', 0.82],
  ['european_badger', 'European Badger', 'europe', 'neutral', 'quadruped', 0.55],
  ['red_squirrel', 'Red Squirrel', 'europe', 'passive', 'quadruped', 0.25],
  ['european_hedgehog', 'European Hedgehog', 'europe', 'passive', 'quadruped', 0.24],
  ['pine_marten', 'European Pine Marten', 'europe', 'passive', 'quadruped', 0.42],
  ['stoat', 'Stoat', 'europe', 'neutral', 'quadruped', 0.28],
  ['european_hare', 'European Hare', 'europe', 'passive', 'quadruped', 0.45],
  ['monk_seal', 'Mediterranean Monk Seal', 'europe', 'aquatic', 'seal', 1.0],
  ['mute_swan', 'Mute Swan', 'europe', 'aerial', 'waterbird', 1.2],
  ['white_stork', 'White Stork', 'europe', 'aerial', 'waterbird', 1.1],
  ['barn_owl', 'Barn Owl', 'europe', 'aerial', 'raptor', 0.8],
  ['tawny_owl', 'Tawny Owl', 'europe', 'aerial', 'raptor', 0.75],
  ['eurasian_eagle_owl', 'Eurasian Eagle-Owl', 'europe', 'aerial', 'raptor', 1.05],
  ['common_kestrel', 'Common Kestrel', 'europe', 'aerial', 'raptor', 0.7],
  ['european_robin', 'European Robin', 'europe', 'aerial', 'bird', 0.36],
  ['kingfisher', 'Common Kingfisher', 'europe', 'aerial', 'bird', 0.4],
  ['magpie', 'Eurasian Magpie', 'europe', 'aerial', 'bird', 0.62],
  ['raven', 'Common Raven', 'europe', 'aerial', 'bird', 0.85],
  ['pheasant', 'Common Pheasant', 'europe', 'passive', 'bird', 0.8],
  ['european_adder', 'European Adder', 'europe', 'aggressive', 'serpent', 0.62],
  ['grass_snake', 'Grass Snake', 'europe', 'passive', 'serpent', 0.7],
  ['slow_worm', 'Slow Worm', 'europe', 'passive', 'serpent', 0.45],
  ['fire_salamander', 'Fire Salamander', 'europe', 'passive', 'amphibian', 0.9],
  ['european_tree_frog', 'European Tree Frog', 'europe', 'passive', 'amphibian', 0.65],

  // ---------------------------------------------------------------------------
  // Africa
  // ---------------------------------------------------------------------------
  ['african_forest_elephant', 'African Forest Elephant', 'africa', 'neutral', 'ungulate', 1.8],
  ['leopard', 'Leopard', 'africa', 'aggressive', 'quadruped', 0.95],
  ['striped_hyena', 'Striped Hyena', 'africa', 'aggressive', 'quadruped', 0.82],
  ['african_wild_dog', 'African Wild Dog', 'africa', 'aggressive', 'quadruped', 0.8],
  ['black_backed_jackal', 'Black-backed Jackal', 'africa', 'neutral', 'quadruped', 0.62],
  ['serval', 'Serval', 'africa', 'neutral', 'quadruped', 0.65],
  ['caracal', 'Caracal', 'africa', 'neutral', 'quadruped', 0.68],
  ['white_rhinoceros', 'White Rhinoceros', 'africa', 'neutral', 'ungulate', 1.55],
  ['black_rhinoceros', 'Black Rhinoceros', 'africa', 'aggressive', 'ungulate', 1.45],
  ['pygmy_hippo', 'Pygmy Hippopotamus', 'africa', 'neutral', 'ungulate', 0.9],
  ['okapi', 'Okapi', 'africa', 'passive', 'ungulate', 1.0],
  ['grevy_zebra', 'Grévy’s Zebra', 'africa', 'passive', 'ungulate', 1.1],
  ['wildebeest', 'Blue Wildebeest', 'africa', 'neutral', 'ungulate', 1.15],
  ['cape_buffalo', 'Cape Buffalo', 'africa', 'aggressive', 'ungulate', 1.35],
  ['impala', 'Impala', 'africa', 'passive', 'ungulate', 0.78],
  ['springbok', 'Springbok', 'africa', 'passive', 'ungulate', 0.7],
  ['thomsons_gazelle', 'Thomson’s Gazelle', 'africa', 'passive', 'ungulate', 0.68],
  ['greater_kudu', 'Greater Kudu', 'africa', 'passive', 'ungulate', 1.05],
  ['oryx', 'Oryx', 'africa', 'neutral', 'ungulate', 0.95],
  ['sable_antelope', 'Sable Antelope', 'africa', 'neutral', 'ungulate', 1.05],
  ['eland', 'Eland', 'africa', 'passive', 'ungulate', 1.2],
  ['warthog', 'Warthog', 'africa', 'neutral', 'ungulate', 0.68],
  ['red_river_hog', 'Red River Hog', 'africa', 'neutral', 'ungulate', 0.75],
  ['chimpanzee', 'Chimpanzee', 'africa', 'neutral', 'primate', 0.85],
  ['bonobo', 'Bonobo', 'africa', 'passive', 'primate', 0.78],
  ['olive_baboon', 'Olive Baboon', 'africa', 'neutral', 'primate', 0.82],
  ['mandrill', 'Mandrill', 'africa', 'aggressive', 'primate', 0.88],
  ['ring_tailed_lemur', 'Ring-tailed Lemur', 'africa', 'passive', 'primate', 0.55],
  ['vervet_monkey', 'Vervet Monkey', 'africa', 'passive', 'primate', 0.58],
  ['meerkat', 'Meerkat', 'africa', 'passive', 'quadruped', 0.3],
  ['honey_badger', 'Honey Badger', 'africa', 'aggressive', 'quadruped', 0.55],
  ['aardvark', 'Aardvark', 'africa', 'passive', 'quadruped', 0.7],
  ['pangolin', 'Ground Pangolin', 'africa', 'passive', 'quadruped', 0.5],
  ['fennec_fox', 'Fennec Fox', 'africa', 'passive', 'quadruped', 0.36],
  ['rock_hyrax', 'Rock Hyrax', 'africa', 'passive', 'quadruped', 0.35],
  ['african_crested_porcupine', 'African Crested Porcupine', 'africa', 'neutral', 'quadruped', 0.65],
  ['secretarybird', 'Secretarybird', 'africa', 'aerial', 'raptor', 1.15],
  ['shoebill', 'Shoebill', 'africa', 'aerial', 'waterbird', 1.3],
  ['marabou_stork', 'Marabou Stork', 'africa', 'aerial', 'waterbird', 1.35],
  ['african_fish_eagle', 'African Fish Eagle', 'africa', 'aerial', 'raptor', 1.15],
  ['martial_eagle', 'Martial Eagle', 'africa', 'aerial', 'raptor', 1.3],
  ['griffon_vulture', 'Griffon Vulture', 'africa', 'aerial', 'raptor', 1.4],
  ['grey_crowned_crane', 'Grey Crowned Crane', 'africa', 'aerial', 'waterbird', 1.15],
  ['hornbill', 'Southern Ground Hornbill', 'africa', 'aerial', 'bird', 0.95],
  ['guinea_fowl', 'Helmeted Guineafowl', 'africa', 'passive', 'bird', 0.7],
  ['weaver_bird', 'Weaver Bird', 'africa', 'aerial', 'bird', 0.4],
  ['nile_crocodile', 'Nile Crocodile', 'africa', 'aggressive', 'crocodile', 1.45],
  ['black_mamba', 'Black Mamba', 'africa', 'aggressive', 'serpent', 1.15],
  ['puff_adder', 'Puff Adder', 'africa', 'aggressive', 'serpent', 0.85],
  ['african_rock_python', 'African Rock Python', 'africa', 'aggressive', 'serpent', 1.5],
  ['spitting_cobra', 'Spitting Cobra', 'africa', 'aggressive', 'serpent', 0.9],
  ['leopard_tortoise', 'Leopard Tortoise', 'africa', 'passive', 'turtle', 0.9],
  ['nile_monitor', 'Nile Monitor', 'africa', 'neutral', 'lizard', 1.15],
  ['veiled_chameleon', 'Veiled Chameleon', 'africa', 'passive', 'lizard', 0.6],

  // ---------------------------------------------------------------------------
  // Asia
  // ---------------------------------------------------------------------------
  ['bengal_tiger', 'Bengal Tiger', 'asia', 'aggressive', 'quadruped', 1.3],
  ['siberian_tiger', 'Siberian Tiger', 'asia', 'aggressive', 'quadruped', 1.4],
  ['snow_leopard', 'Snow Leopard', 'asia', 'aggressive', 'quadruped', 0.95],
  ['clouded_leopard', 'Clouded Leopard', 'asia', 'aggressive', 'quadruped', 0.8],
  ['asiatic_lion', 'Asiatic Lion', 'asia', 'aggressive', 'quadruped', 1.1],
  ['asian_elephant', 'Asian Elephant', 'asia', 'neutral', 'ungulate', 1.7],
  ['red_panda', 'Red Panda', 'asia', 'passive', 'quadruped', 0.48],
  ['sun_bear', 'Sun Bear', 'asia', 'neutral', 'quadruped', 0.9],
  ['sloth_bear', 'Sloth Bear', 'asia', 'aggressive', 'quadruped', 1.1],
  ['moon_bear', 'Moon Bear', 'asia', 'aggressive', 'quadruped', 1.15],
  ['bornean_orangutan', 'Bornean Orangutan', 'asia', 'neutral', 'primate', 1.15],
  ['sumatran_orangutan', 'Sumatran Orangutan', 'asia', 'neutral', 'primate', 1.1],
  ['lar_gibbon', 'Lar Gibbon', 'asia', 'passive', 'primate', 0.75],
  ['proboscis_monkey', 'Proboscis Monkey', 'asia', 'passive', 'primate', 0.8],
  ['japanese_macaque', 'Japanese Macaque', 'asia', 'neutral', 'primate', 0.72],
  ['golden_snub_nosed_monkey', 'Golden Snub-nosed Monkey', 'asia', 'passive', 'primate', 0.78],
  ['indian_rhinoceros', 'Indian Rhinoceros', 'asia', 'aggressive', 'ungulate', 1.5],
  ['javan_rhinoceros', 'Javan Rhinoceros', 'asia', 'neutral', 'ungulate', 1.4],
  ['malayan_tapir', 'Malayan Tapir', 'asia', 'passive', 'ungulate', 1.0],
  ['bactrian_camel', 'Bactrian Camel', 'asia', 'neutral', 'ungulate', 1.3],
  ['dromedary_camel', 'Dromedary Camel', 'asia', 'neutral', 'ungulate', 1.2],
  ['wild_yak', 'Wild Yak', 'asia', 'aggressive', 'ungulate', 1.5],
  ['water_buffalo', 'Water Buffalo', 'asia', 'neutral', 'ungulate', 1.4],
  ['gaur', 'Gaur', 'asia', 'aggressive', 'ungulate', 1.5],
  ['saiga_antelope', 'Saiga Antelope', 'asia', 'passive', 'ungulate', 0.85],
  ['markhor', 'Markhor', 'asia', 'neutral', 'ungulate', 1.0],
  ['siberian_ibex', 'Siberian Ibex', 'asia', 'neutral', 'ungulate', 0.95],
  ['przewalskis_horse', 'Przewalski’s Horse', 'asia', 'neutral', 'ungulate', 1.0],
  ['mongolian_wild_ass', 'Mongolian Wild Ass', 'asia', 'passive', 'ungulate', 0.9],
  ['dhole', 'Dhole', 'asia', 'aggressive', 'quadruped', 0.72],
  ['raccoon_dog', 'Raccoon Dog', 'asia', 'passive', 'quadruped', 0.55],
  ['binturong', 'Binturong', 'asia', 'neutral', 'quadruped', 0.7],
  ['asian_small_clawed_otter', 'Asian Small-clawed Otter', 'asia', 'aquatic', 'quadruped', 0.52],
  ['tarsier', 'Philippine Tarsier', 'asia', 'passive', 'primate', 0.24],
  ['slow_loris', 'Slow Loris', 'asia', 'passive', 'primate', 0.3],
  ['sugar_glider', 'Sugar Glider', 'asia', 'passive', 'quadruped', 0.22],
  ['peafowl', 'Indian Peafowl', 'asia', 'passive', 'bird', 1.0],
  ['red_crowned_crane', 'Red-crowned Crane', 'asia', 'aerial', 'waterbird', 1.3],
  ['stellers_sea_eagle', 'Steller’s Sea Eagle', 'asia', 'aerial', 'raptor', 1.55],
  ['cassowary', 'Southern Cassowary', 'asia', 'neutral', 'bird', 1.45],
  ['mandarin_duck', 'Mandarin Duck', 'asia', 'aerial', 'waterbird', 0.6],
  ['swiftlet', 'Edible-nest Swiftlet', 'asia', 'aerial', 'bird', 0.3],
  ['komodo_dragon', 'Komodo Dragon', 'asia', 'aggressive', 'lizard', 1.8],
  ['king_cobra', 'King Cobra', 'asia', 'aggressive', 'serpent', 1.35],
  ['reticulated_python', 'Reticulated Python', 'asia', 'aggressive', 'serpent', 1.8],
  ['indian_python', 'Indian Python', 'asia', 'aggressive', 'serpent', 1.45],
  ['gharial', 'Gharial', 'asia', 'aggressive', 'crocodile', 1.4],
  ['chinese_giant_salamander', 'Chinese Giant Salamander', 'asia', 'passive', 'amphibian', 1.5],
  ['flying_dragon', 'Flying Dragon', 'asia', 'passive', 'lizard', 0.7],

  // ---------------------------------------------------------------------------
  // Australia & Oceania
  // ---------------------------------------------------------------------------
  ['eastern_grey_kangaroo', 'Eastern Grey Kangaroo', 'australia', 'passive', 'ungulate', 1.05],
  ['wallaby', 'Wallaby', 'australia', 'passive', 'ungulate', 0.65],
  ['quokka', 'Quokka', 'australia', 'passive', 'ungulate', 0.55],
  ['koala', 'Koala', 'australia', 'passive', 'primate', 0.65],
  ['wombat', 'Common Wombat', 'australia', 'passive', 'quadruped', 0.65],
  ['tasmanian_devil', 'Tasmanian Devil', 'australia', 'aggressive', 'quadruped', 0.62],
  ['platypus', 'Platypus', 'australia', 'aquatic', 'quadruped', 0.5],
  ['echidna', 'Short-beaked Echidna', 'australia', 'passive', 'quadruped', 0.5],
  ['dingo', 'Dingo', 'australia', 'aggressive', 'quadruped', 0.8],
  ['brushtail_possum', 'Brushtail Possum', 'australia', 'passive', 'quadruped', 0.48],
  ['bilby', 'Bilby', 'australia', 'passive', 'quadruped', 0.3],
  ['numbat', 'Numbat', 'australia', 'passive', 'quadruped', 0.28],
  ['bandicoot', 'Bandicoot', 'australia', 'passive', 'quadruped', 0.35],
  ['tree_kangaroo', 'Tree Kangaroo', 'australia', 'passive', 'ungulate', 0.7],
  ['flying_fox', 'Flying Fox', 'australia', 'aerial', 'bird', 0.85],
  ['emu', 'Emu', 'australia', 'passive', 'bird', 1.6],
  ['kiwi', 'Kiwi', 'australia', 'passive', 'bird', 0.55],
  ['kookaburra', 'Laughing Kookaburra', 'australia', 'aerial', 'bird', 0.55],
  ['cockatoo', 'Sulphur-crested Cockatoo', 'australia', 'aerial', 'bird', 0.65],
  ['budgerigar', 'Budgerigar', 'australia', 'aerial', 'bird', 0.3],
  ['black_swan', 'Black Swan', 'australia', 'aerial', 'waterbird', 1.15],
  ['lyrebird', 'Superb Lyrebird', 'australia', 'passive', 'bird', 0.8],
  ['kea', 'Kea', 'australia', 'aerial', 'bird', 0.7],
  ['kakapo', 'Kakapo', 'australia', 'passive', 'bird', 0.75],
  ['fairy_penguin', 'Fairy Penguin', 'australia', 'passive', 'penguin', 0.65],
  ['freshwater_crocodile', 'Freshwater Crocodile', 'australia', 'neutral', 'crocodile', 1.15],
  ['inland_taipan', 'Inland Taipan', 'australia', 'aggressive', 'serpent', 1.0],
  ['eastern_brown_snake', 'Eastern Brown Snake', 'australia', 'aggressive', 'serpent', 1.05],
  ['frilled_neck_lizard', 'Frilled-neck Lizard', 'australia', 'neutral', 'lizard', 0.9],
  ['thorny_devil', 'Thorny Devil', 'australia', 'passive', 'lizard', 0.6],
  ['perentie', 'Perentie Monitor', 'australia', 'neutral', 'lizard', 1.5],
  ['blue_tongued_skink', 'Blue-tongued Skink', 'australia', 'passive', 'lizard', 0.7],

  // ---------------------------------------------------------------------------
  // Antarctica & sub-Antarctic
  // ---------------------------------------------------------------------------
  ['emperor_penguin', 'Emperor Penguin', 'antarctica', 'passive', 'penguin', 1.25],
  ['king_penguin', 'King Penguin', 'antarctica', 'passive', 'penguin', 1.1],
  ['adelie_penguin', 'Adélie Penguin', 'antarctica', 'passive', 'penguin', 0.85],
  ['chinstrap_penguin', 'Chinstrap Penguin', 'antarctica', 'passive', 'penguin', 0.9],
  ['gentoo_penguin', 'Gentoo Penguin', 'antarctica', 'passive', 'penguin', 0.95],
  ['wandering_albatross', 'Wandering Albatross', 'antarctica', 'aerial', 'raptor', 1.8],
  ['skua', 'Great Skua', 'antarctica', 'aerial', 'raptor', 0.85],
  ['snow_petrel', 'Snow Petrel', 'antarctica', 'aerial', 'bird', 0.55],
  ['leopard_seal', 'Leopard Seal', 'antarctica', 'aquatic', 'seal', 1.35],
  ['weddell_seal', 'Weddell Seal', 'antarctica', 'aquatic', 'seal', 1.15],
  ['crabeater_seal', 'Crabeater Seal', 'antarctica', 'aquatic', 'seal', 1.1],
  ['southern_elephant_seal', 'Southern Elephant Seal', 'antarctica', 'aquatic', 'seal', 1.7],
  ['antarctic_fur_seal', 'Antarctic Fur Seal', 'antarctica', 'aquatic', 'seal', 1.0],

  // ---------------------------------------------------------------------------
  // Cities & urban wildlife
  // ---------------------------------------------------------------------------
  ['brown_rat', 'Brown Rat', 'urban', 'urban', 'quadruped', 0.2],
  ['house_mouse', 'House Mouse', 'urban', 'urban', 'quadruped', 0.14],
  ['alley_cat', 'Alley Cat', 'urban', 'urban', 'quadruped', 0.42],
  ['stray_dog', 'Stray Dog', 'urban', 'urban', 'quadruped', 0.62],
  ['gray_squirrel', 'Gray Squirrel', 'urban', 'urban', 'quadruped', 0.24],
  ['eastern_cottontail', 'Eastern Cottontail', 'urban', 'urban', 'quadruped', 0.34],
  ['fruit_bat', 'Fruit Bat', 'urban', 'urban', 'bird', 0.55],
  ['microbat', 'Microbat', 'urban', 'urban', 'bird', 0.22],
  ['macaque', 'Urban Macaque', 'urban', 'urban', 'primate', 0.65],
  ['rock_pigeon', 'Rock Pigeon', 'urban', 'urban', 'bird', 0.45],
  ['house_sparrow', 'House Sparrow', 'urban', 'urban', 'bird', 0.3],
  ['european_starling', 'European Starling', 'urban', 'urban', 'bird', 0.4],
  ['american_crow', 'American Crow', 'urban', 'urban', 'bird', 0.72],
  ['herring_gull', 'Herring Gull', 'urban', 'urban', 'waterbird', 0.95],
  ['mourning_dove', 'Mourning Dove', 'urban', 'urban', 'bird', 0.45],
  ['honeybee', 'Honeybee', 'urban', 'urban', 'insect', 0.75],
  ['bumblebee', 'Bumblebee', 'urban', 'urban', 'insect', 0.85],
  ['wasp', 'Paper Wasp', 'urban', 'urban', 'insect', 0.7],
  ['hornet', 'European Hornet', 'urban', 'urban', 'insect', 0.95],
  ['monarch_butterfly', 'Monarch Butterfly', 'urban', 'urban', 'insect', 0.75],
  ['swallowtail_butterfly', 'Swallowtail Butterfly', 'urban', 'urban', 'insect', 0.8],
  ['dragonfly', 'Dragonfly', 'urban', 'urban', 'insect', 0.9],
  ['firefly', 'Firefly', 'urban', 'urban', 'insect', 0.45],
  ['praying_mantis', 'Praying Mantis', 'urban', 'urban', 'insect', 0.7],
  ['cicada', 'Cicada', 'urban', 'urban', 'insect', 0.55],
  ['grasshopper', 'Grasshopper', 'urban', 'urban', 'insect', 0.6],
  ['cricket', 'Field Cricket', 'urban', 'urban', 'insect', 0.45],
  ['ladybug', 'Ladybug', 'urban', 'urban', 'insect', 0.35],
  ['stag_beetle', 'Stag Beetle', 'urban', 'urban', 'insect', 0.65],
  ['hercules_beetle', 'Hercules Beetle', 'urban', 'urban', 'insect', 0.8],
  ['dung_beetle', 'Dung Beetle', 'urban', 'urban', 'insect', 0.55],
  ['leafcutter_ant', 'Leafcutter Ant', 'urban', 'urban', 'insect', 0.3],
  ['fire_ant', 'Fire Ant', 'urban', 'urban', 'insect', 0.22],
  ['black_widow', 'Black Widow Spider', 'urban', 'urban', 'insect', 0.35],
  ['tarantula', 'Tarantula', 'urban', 'urban', 'insect', 0.6],
  ['emperor_scorpion', 'Emperor Scorpion', 'urban', 'urban', 'insect', 0.55],
  ['centipede', 'Centipede', 'urban', 'urban', 'insect', 0.4],
  ['earthworm', 'Earthworm', 'urban', 'urban', 'insect', 0.25],
  ['garden_snail', 'Garden Snail', 'urban', 'urban', 'insect', 0.3],

  // ---------------------------------------------------------------------------
  // Oceans, coral reefs & deep sea
  // ---------------------------------------------------------------------------
  ['blue_whale', 'Blue Whale', 'ocean', 'aquatic', 'cetacean', 2.8],
  ['humpback_whale', 'Humpback Whale', 'ocean', 'aquatic', 'cetacean', 2.2],
  ['orca', 'Orca', 'ocean', 'aquatic', 'cetacean', 1.8],
  ['sperm_whale', 'Sperm Whale', 'ocean', 'aquatic', 'cetacean', 2.1],
  ['beluga_whale', 'Beluga Whale', 'ocean', 'aquatic', 'cetacean', 1.4],
  ['narwhal', 'Narwhal', 'ocean', 'aquatic', 'cetacean', 1.35],
  ['bottlenose_dolphin', 'Bottlenose Dolphin', 'ocean', 'aquatic', 'cetacean', 1.0],
  ['spinner_dolphin', 'Spinner Dolphin', 'ocean', 'aquatic', 'cetacean', 0.9],
  ['sea_otter', 'Sea Otter', 'ocean', 'aquatic', 'quadruped', 0.55],
  ['harbor_seal', 'Harbor Seal', 'ocean', 'aquatic', 'seal', 0.9],
  ['california_sea_lion', 'California Sea Lion', 'ocean', 'aquatic', 'seal', 1.0],
  ['walrus', 'Walrus', 'ocean', 'aquatic', 'seal', 1.35],
  ['manatee', 'Manatee', 'ocean', 'aquatic', 'cetacean', 1.2],
  ['dugong', 'Dugong', 'ocean', 'aquatic', 'cetacean', 1.1],
  ['tiger_shark', 'Tiger Shark', 'ocean', 'aquatic', 'shark', 1.45],
  ['hammerhead_shark', 'Hammerhead Shark', 'ocean', 'aquatic', 'shark', 1.35],
  ['whale_shark', 'Whale Shark', 'ocean', 'aquatic', 'shark', 2.2],
  ['bull_shark', 'Bull Shark', 'ocean', 'aquatic', 'shark', 1.1],
  ['mako_shark', 'Mako Shark', 'ocean', 'aquatic', 'shark', 1.0],
  ['nurse_shark', 'Nurse Shark', 'ocean', 'aquatic', 'shark', 1.05],
  ['stingray', 'Stingray', 'ocean', 'aquatic', 'benthic', 0.9],
  ['sawfish', 'Sawfish', 'ocean', 'aquatic', 'shark', 1.5],
  ['bluefin_tuna', 'Bluefin Tuna', 'ocean', 'aquatic', 'fish', 1.2],
  ['atlantic_salmon', 'Atlantic Salmon', 'ocean', 'aquatic', 'fish', 0.9],
  ['swordfish', 'Swordfish', 'ocean', 'aquatic', 'fish', 1.45],
  ['sailfish', 'Sailfish', 'ocean', 'aquatic', 'fish', 1.3],
  ['marlin', 'Blue Marlin', 'ocean', 'aquatic', 'fish', 1.5],
  ['clownfish', 'Clownfish', 'ocean', 'aquatic', 'fish', 0.5],
  ['blue_tang', 'Blue Tang', 'ocean', 'aquatic', 'fish', 0.55],
  ['lionfish', 'Lionfish', 'ocean', 'aquatic', 'fish', 0.65],
  ['pufferfish', 'Pufferfish', 'ocean', 'aquatic', 'fish', 0.6],
  ['moray_eel', 'Moray Eel', 'ocean', 'aquatic', 'serpent', 1.0],
  ['electric_eel', 'Electric Eel', 'ocean', 'aquatic', 'serpent', 1.2],
  ['seahorse', 'Seahorse', 'ocean', 'aquatic', 'fish', 0.35],
  ['anglerfish', 'Anglerfish', 'ocean', 'aquatic', 'fish', 0.55],
  ['giant_oarfish', 'Giant Oarfish', 'ocean', 'aquatic', 'serpent', 2.0],
  ['coelacanth', 'Coelacanth', 'ocean', 'aquatic', 'fish', 1.1],
  ['pirarucu', 'Pirarucu', 'ocean', 'aquatic', 'fish', 1.4],
  ['red_bellied_piranha', 'Red-bellied Piranha', 'ocean', 'aquatic', 'fish', 0.55],
  ['sturgeon', 'Sturgeon', 'ocean', 'aquatic', 'fish', 1.3],
  ['catfish', 'Catfish', 'ocean', 'aquatic', 'fish', 0.9],
  ['carp', 'Carp', 'ocean', 'aquatic', 'fish', 0.8],
  ['koi', 'Koi', 'ocean', 'aquatic', 'fish', 0.75],
  ['giant_pacific_octopus', 'Giant Pacific Octopus', 'ocean', 'aquatic', 'cephalopod', 1.2],
  ['blue_ringed_octopus', 'Blue-ringed Octopus', 'ocean', 'aquatic', 'cephalopod', 0.45],
  ['giant_squid', 'Giant Squid', 'ocean', 'aquatic', 'cephalopod', 1.8],
  ['colossal_squid', 'Colossal Squid', 'ocean', 'aquatic', 'cephalopod', 2.0],
  ['cuttlefish', 'Cuttlefish', 'ocean', 'aquatic', 'cephalopod', 0.8],
  ['nautilus', 'Nautilus', 'ocean', 'aquatic', 'cephalopod', 0.55],
  ['moon_jellyfish', 'Moon Jellyfish', 'ocean', 'aquatic', 'benthic', 0.7],
  ['portuguese_man_o_war', 'Portuguese Man o’ War', 'ocean', 'aquatic', 'benthic', 0.8],
  ['leatherback_turtle', 'Leatherback Sea Turtle', 'ocean', 'aquatic', 'turtle', 1.6],
  ['hawksbill_turtle', 'Hawksbill Sea Turtle', 'ocean', 'aquatic', 'turtle', 1.0],
  ['japanese_spider_crab', 'Japanese Spider Crab', 'ocean', 'aquatic', 'crab', 1.6],
  ['coconut_crab', 'Coconut Crab', 'ocean', 'aquatic', 'crab', 1.0],
  ['american_lobster', 'American Lobster', 'ocean', 'aquatic', 'crab', 0.7],
  ['mantis_shrimp', 'Mantis Shrimp', 'ocean', 'aquatic', 'crab', 0.55],
  ['starfish', 'Starfish', 'ocean', 'aquatic', 'benthic', 0.6],
  ['sea_urchin', 'Sea Urchin', 'ocean', 'aquatic', 'benthic', 0.5],
] as const satisfies readonly RosterRow[];

export interface GlobalWildlifeEntry {
  id: (typeof ROWS)[number][0];
  name: string;
  region: WildlifeRegion;
  category: WildlifeCategory;
  archetype: WildlifeArchetype;
  scale: number;
  biomes: readonly string[];
  aquatic: boolean;
  aerial: boolean;
  urban: boolean;
}

export type GlobalSpeciesId = (typeof ROWS)[number][0];

const LAND_BIOMES: Record<Exclude<WildlifeRegion, 'urban' | 'ocean'>, readonly string[]> = {
  north_america: [
    'forest',
    'flower_forest',
    'birch_forest',
    'taiga',
    'snowy_taiga',
    'plains',
    'meadow',
    'windswept_forest',
    'windswept_hills',
    'badlands',
    'wooded_badlands',
    'mountain',
    'snowy_slopes',
  ],
  arctic: [
    'snowy_plains',
    'ice_spikes',
    'snowy_taiga',
    'snowy_slopes',
    'frozen_peaks',
    'jagged_peaks',
    'frozen_river',
    'snowy_beach',
  ],
  south_america: [
    'jungle',
    'sparse_jungle',
    'bamboo_jungle',
    'swamp',
    'mangrove_swamp',
    'river',
    'lake',
    'beach',
    'savanna',
  ],
  europe: [
    'forest',
    'birch_forest',
    'old_growth_birch_forest',
    'flower_forest',
    'meadow',
    'taiga',
    'old_growth_pine_taiga',
    'old_growth_spruce_taiga',
    'windswept_hills',
    'mountain',
    'stony_peaks',
    'river',
    'lake',
  ],
  africa: [
    'savanna',
    'savanna_plateau',
    'windswept_savanna',
    'desert',
    'badlands',
    'swamp',
    'river',
    'lake',
    'beach',
  ],
  asia: [
    'jungle',
    'bamboo_jungle',
    'sparse_jungle',
    'taiga',
    'snowy_taiga',
    'mountain',
    'stony_peaks',
    'jagged_peaks',
    'plains',
    'meadow',
    'desert',
    'badlands',
    'river',
    'lake',
  ],
  australia: [
    'savanna',
    'desert',
    'badlands',
    'wooded_badlands',
    'jungle',
    'forest',
    'beach',
    'river',
    'lake',
    'mountain',
  ],
  antarctica: [
    'snowy_plains',
    'ice_spikes',
    'snowy_beach',
    'frozen_river',
    'frozen_peaks',
    'snowy_slopes',
    'mountain',
  ],
};

const URBAN_BIOMES = [
  'plains',
  'sunflower_plains',
  'forest',
  'meadow',
  'savanna',
  'desert',
  'beach',
  'stony_shore',
] as const;

const AQUATIC_BIOMES: Record<Exclude<WildlifeRegion, 'urban'>, readonly string[]> = {
  north_america: ['river', 'lake', 'ocean', 'cold_ocean'],
  arctic: ['frozen_ocean', 'cold_ocean', 'frozen_river', 'snowy_beach'],
  south_america: ['river', 'lake', 'swamp', 'mangrove_swamp', 'warm_ocean'],
  europe: ['river', 'lake', 'ocean', 'cold_ocean', 'beach'],
  africa: ['river', 'lake', 'swamp', 'warm_ocean', 'beach'],
  asia: ['river', 'lake', 'warm_ocean', 'lukewarm_ocean', 'beach'],
  australia: ['river', 'lake', 'warm_ocean', 'beach'],
  antarctica: ['frozen_ocean', 'cold_ocean', 'snowy_beach'],
  ocean: ['ocean', 'warm_ocean', 'lukewarm_ocean', 'cold_ocean', 'frozen_ocean'],
};

function biomeSetFor(
  region: WildlifeRegion,
  category: WildlifeCategory,
  aquatic: boolean,
  aerial: boolean,
): readonly string[] {
  if (category === 'urban' || region === 'urban') return URBAN_BIOMES;
  if (aquatic) {
    return AQUATIC_BIOMES[region as Exclude<WildlifeRegion, 'urban'>];
  }
  if (region === 'ocean') {
    return aerial
      ? ['ocean', 'cold_ocean', 'frozen_ocean', 'beach', 'snowy_beach']
      : AQUATIC_BIOMES.ocean;
  }
  return LAND_BIOMES[region];
}

export const GLOBAL_WILDLIFE_ROSTER: readonly GlobalWildlifeEntry[] = ROWS.map(
  ([id, name, region, category, archetype, scale]) => {
    const aquatic = category === 'aquatic';
    const aerial = category === 'aerial';
    return {
      id,
      name,
      region,
      category,
      archetype,
      scale,
      biomes: biomeSetFor(region, category, aquatic, aerial),
      aquatic,
      aerial,
      urban: category === 'urban',
    };
  },
);

export const MAX_WILDLIFE_DENSITY_AGENTS = 168;
export const MIN_WILDLIFE_DENSITY_AGENTS = 0;

export function wildlifeDensityAgentCap(
  density: number,
  isTouchDevice = false,
): number {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(density) ? density : 0.75));
  const platformCap = isTouchDevice ? 108 : MAX_WILDLIFE_DENSITY_AGENTS;
  return Math.round(Math.max(MIN_WILDLIFE_DENSITY_AGENTS, clamped * platformCap));
}

export function normalizeWildlifeDensity(raw: unknown): number {
  const density = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0.75;
  return Math.max(0, Math.min(1, density));
}

/**
 * Finds every roster species that can naturally inhabit a biome. Urban species
 * are only eligible when the caller says a settlement/building cluster is near.
 */
export function getRosterSpawnCandidates(
  biome: string,
  options: { nearUrban?: boolean; night?: boolean } = {},
): GlobalWildlifeEntry[] {
  const nearUrban = options.nearUrban === true;
  return GLOBAL_WILDLIFE_ROSTER.filter((entry) => {
    if (entry.urban && !nearUrban) return false;
    if (entry.biomes.includes(biome)) return true;
    // Urban wildlife also spills onto adjacent outskirts.
    if (entry.urban && nearUrban && entry.biomes.includes('plains')) return true;
    return false;
  });
}

export function getRosterSpeciesById(
  id: string,
): GlobalWildlifeEntry | undefined {
  return GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === id);
}

export function getRosterRegionSpecies(region: WildlifeRegion): GlobalWildlifeEntry[] {
  return GLOBAL_WILDLIFE_ROSTER.filter((entry) => entry.region === region);
}
