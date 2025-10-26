function processSteamGames(response) {
    //remove games with 0 playtime
    games = response.games.filter(game => game.playtime_forever > 0);
    //sort by playtime descending
    games = games.sort((a, b) => b.playtime_forever - a.playtime_forever);
    //calculate total hours played
    totalHours = games.reduce((sum, game) => sum + game.playtime_forever, 0);
    //round all games to a even fraction of total
    // x% ~= 1/y where y is an power of 2
    //so a game could be half of the total size, a quarter, an eighth, a sixteenth, etc
    //this creates sizes that will fit together
    games.forEach(game => {
        let fractionOfTotal = game.playtime_forever / totalHours;
        //abs it because the log of a fraction is negative
        //ceil is actually rounding down because this is a fraction(1/1.5 -> 1/2) if we dont do this we run out of space(i found out the hard way)
        let power = Math.ceil(Math.abs(Math.log2(fractionOfTotal)));
        //this gets just the denominator of the fraction
        game.fractionOfHours = 2 ** power;
    });
    return games;
}

//do a breadth first search to find space for each game
function findSpotToInsert(layer, layersFartherDownToGo) {
    console.log("Finding spot in layer:", layer, "with layersFartherDownToGo:", layersFartherDownToGo);
    //if we are at the correct debth, and there is room, return this layer
    if (layersFartherDownToGo == 0 && layer.length < 2) {
        return layer;
    }

    //check weather items are games or arrays
    item1Array = Array.isArray(layer[0]);
    item2Array = Array.isArray(layer[1]);
    if ((!item1Array && !item2Array) && layer.length == 2) {
        //both items are games, no space
        //we must backtrack
        return false;
    } else if (layersFartherDownToGo !== 0) { //we can go down more layers
        if (item1Array && item2Array) {
            //both items are arrays, check both
            item1 = findSpotToInsert(layer[0], layersFartherDownToGo - 1);
            if (item1) {
                return item1;
            }
            //it returned false, we backtracked, check second item(we will backtrack farther if needed)
            item2 = findSpotToInsert(layer[1], layersFartherDownToGo - 1);
            if (item2) {
                return item2;
            }
        } else if (item1Array) {
            //only first item is array, check it
            item1 = findSpotToInsert(layer[0], layersFartherDownToGo - 1);
            if (item1) {
                return item1;
            }
        } else if (item2Array) {
            //only second item is array, check it
            item2 = findSpotToInsert(layer[1], layersFartherDownToGo - 1);
            if (item2) {
                return item2;
            }
        }
    }
    //if we need to go father, and there is room, create a layer
    if (layersFartherDownToGo > 0 && layer.length < 2) {
        //create a new layer here
        layer.push([]);
        //and go down it
        return findSpotToInsert(layer[layer.length-1], layersFartherDownToGo-1);
    }
    //we need to backtrack and take the second item
    return false;
}

function createGameArangement(games) {
    //the whole area is broken into halves, and then these halves are broken into halves and so on
    //so arangment is an array with two arays inside it(or a game and an array), each of which can have two arrays inside them and so on
    arangement = [];

    games.forEach(game => {
        //how many layers down in the arangement tree this game should go
        let layersIn = Math.log2(game.fractionOfHours); //eg 1/2 of total = 1 layer, 1/8 of total = 3 layers
        console.log(game.fractionOfHours, "layersIn =", layersIn);
        //try to find a spot to insert this game
        let spot = findSpotToInsert(arangement, layersIn - 1);
        if (spot) {
            //we found a spot, insert it
            //the position in the arangmenet is all we need, so just push the appid
            spot.push(game);
            console.log("Inserted game", game.appid, "at spot:", spot);
        } else {
            //i dont think this will ever happen
            try {
                throw new Error("Could not find spot to insert game");
            } catch (e) {
                console.error(e);
                console.log("Current arangement:", arangement);
                console.log("continuing anyway...");
            }
        }
    });
    return arangement;
}
//now we must create the elements
//the arangment shouldve make larger elements twards the top left, smaller towards bottom right
//this will be a recursive function
//each arangement has two divs, which contents are either an image or another arangement
function createElementsFromArangement(arangement, layer) {
    const container = document.createElement('div');
    //we must find if we are vertical or horizontal split
    //vertical split if even layer, horizontal if odd layer
    const isVerticalSplit = layer % 2 === 0;
    //use flexbox to deal with the layout
    container.style.display = 'flex';
    container.style.flexDirection = isVerticalSplit ? 'row' : 'column';
    container.style.width = '100%';
    container.style.height = '100%';

    //now for each of our two items in the arangement
    //if its an array, we must recurse
    //if its a game, we must create the image element(keeping in mind if we are vertical or horizontal split)
    arangement.forEach(item => {
        const itemContainer = document.createElement('div');
        itemContainer.style.flex = '1';
        itemContainer.style.display = 'flex';
        itemContainer.style.justifyContent = 'center';
        itemContainer.style.alignItems = 'center';
        if(isVerticalSplit){
            itemContainer.width = '50%';
            itemContainer.height = '100%';
        }else{
            itemContainer.width = '100%';
            itemContainer.height = '50%';
        }

        if (Array.isArray(item)) {
            //recurse
            const childElements = createElementsFromArangement(item, layer + 1);
            itemContainer.appendChild(childElements);
        } else {
            //create image element
            //if it is split by a vertical line, then we want a vertical image
            const img = createImageElement(item, isVerticalSplit);
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            itemContainer.appendChild(img);
        }
        container.appendChild(itemContainer);
    });
    return container;
}

function createImageElement(game, isVertical) {
    const img = document.createElement('img');
    let baseUrl;
    let fallbackUrl;
    if (isVertical) {
        baseUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/library_600x900.jpg`;
        fallbackUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
    } else {
        baseUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/capsule_616x353.jpg`;
        fallbackUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
    }

    img.src = baseUrl;
    //1:2 for vertical, 2:1 for horizontal
    img.aspectRatio = 1 / 2 ? isVertical : 2 / 1;

    img.title = `You have ${game.playtime_forever}hrs in ${game.appid}`;
    //fallback if image doesnt exist
    img.onerror = function() {
        if (fallbackUrl) {
            img.src = fallbackUrl;
            //remove onerror to prevent infinite loop
            fallbackUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwACAAMAAAAD/qW6AAAAAElFTkSuQmCC';
        }
    };
    return img;
}

function main(response){
    const games = processSteamGames(response);
    const arangement = createGameArangement(games);
    const elements = createElementsFromArangement(arangement, 0);
    document.getElementById('visualizationContainer').appendChild(elements);
}
main(response);