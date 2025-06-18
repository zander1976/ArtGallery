// Query the backend for data
async function handleQuery(query) {
    try {
        const response = await fetch("./src/GraphQLHandler.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error("Fetch error:", error.message);
        return null;
    }
}

// Query the backend with cache
async function handleQueryCached(query) {
    const cacheKey = JSON.stringify(query);
    const cachedData = getCache(cacheKey);

    if (cachedData) {
        //console.log(`Cache hit for ${cacheKey}`);
        return cachedData;
    }
    //console.log(`Cache miss for ${cacheKey}, fetching new data...`);
    const data = await handleQuery(query);
    if (data) {
        setCache(cacheKey, data);
    }
    return data;
}

// Get cached data if not expired
function getCache(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    try {
        const item = JSON.parse(itemStr);
        if (new Date().getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    } catch (error) {
        console.error("Cache parse error:", error);
        localStorage.removeItem(key);
        return null;
    }
}

// Store data in cache with expiration (ttl is in seconds)
function setCache(key, value) {
    const expiry = Date.now() + 60000;
    localStorage.setItem(key, JSON.stringify({ value, expiry }));
}

// Populate a drop-down select box using a query
async function populateDropdown(dropdownId, query, queryHandler, idHandler, textHandler, selectedValue) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    try {
        const data = await queryHandler(query);

        if (!Array.isArray(data)) {
            console.warn(`Unexpected data format for ${dropdownId}:`, data);
            return;
        }

        // Preserve first option
        const firstOption = dropdown.options[0]?.outerHTML || "";
        dropdown.innerHTML = firstOption;

        // Populate dropdown
        data.forEach(item => {
            const option = document.createElement("option");
            option.value = idHandler(item);
            option.textContent = textHandler(item);

            if (option.value === selectedValue) {
                console.log(`option matched ${option.value}`)
                option.selected = true;
            }

            dropdown.appendChild(option);
        });

    } catch (error) {
        console.error(`Error loading dropdown ${dropdownId}:`, error);
    }
}

// Populate the paintings list
async function populatePaintingList(targetId, query, queryHandler) {
    const artistId = getCache("ArtistIDFilter");
    const galleryId = getCache("GalleryIDFilter");
    const shapeId = getCache("ShapeIDFilter");
    const pageNum = getCache("CurrentPage") || 0;

    // Get the target element or leave if not found
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    // Remove all the old paintings
    while (targetElement.firstChild) {
        targetElement.removeChild(targetElement.firstChild);
    }

    try {
        // Get the paintings and validate that we got correct data
        const paintings = await queryHandler(query);
        if (!Array.isArray(paintings)) {
            console.warn(`Unexpected data format for query "${query}":`, paintings);
            return;
        }

        // Filter the painting list
        const filteredPaintings = paintings.filter(p => {
            return (
                (!artistId || p.ArtistID == artistId) &&
                (!galleryId || p.GalleryID == galleryId) &&
                (!shapeId || p.ShapeID == shapeId)
            );
        });

        // TODO: If no filters are set the shuffle the images

        // Check if we have any paintings and warn them
        if (filteredPaintings.length == 0) {
            const contentDiv = document.createElement("p");
            contentDiv.textContent = "No paintings found with your filter options.";
            targetElement.appendChild(contentDiv);
            return;
        }

        // Set a page count
        const pagedPaintings = filteredPaintings.slice(pageNum * 20, (pageNum + 1) * 20);

        // Populate and format the paintings list
        pagedPaintings.forEach(painting => {
            const listItem = document.createElement("li");
            listItem.classList.add("item");

            const imageLink = document.createElement("a");
            imageLink.href = `single-painting.html?id=${painting.PaintingID}`;
            imageLink.classList.add("ui", "small", "image");

            const img = document.createElement("img");
            img.src = `images/art/works/square-medium/${painting.ImageFileName}.jpg`;
            imageLink.appendChild(img);

            const contentDiv = document.createElement("div");
            contentDiv.classList.add("content");

            const headerLink = document.createElement("a");
            headerLink.href = `single-painting.html?id=${painting.PaintingID}`;
            headerLink.classList.add("header");
            headerLink.textContent = painting.Title;

            const metaDiv = document.createElement("div");
            metaDiv.classList.add("meta");

            const artistSpan = document.createElement("span");
            artistSpan.classList.add("cinema");
            artistSpan.textContent = `${painting.FirstName} ${painting.LastName}`;
            metaDiv.appendChild(artistSpan);

            const descriptionDiv = document.createElement("div");
            descriptionDiv.classList.add("description");

            const descParagraph = document.createElement("p");
            descParagraph.textContent = painting.Excerpt;
            descriptionDiv.appendChild(descParagraph);

            const costMeta = document.createElement("div");
            costMeta.classList.add("meta");

            const costStrong = document.createElement("strong");
            costStrong.textContent = `$${parseFloat(painting.Cost).toFixed(2)}`;
            costMeta.appendChild(costStrong);

            const extraDiv = document.createElement("div");
            extraDiv.classList.add("extra");

            const cartButton = document.createElement("a");
            cartButton.href = `cart.php?id=${painting.PaintingID}`;
            cartButton.classList.add("ui", "icon", "orange", "button");

            const cartIcon = document.createElement("i");
            cartIcon.classList.add("add", "to", "cart", "icon");
            cartButton.appendChild(cartIcon);

            const favButton = document.createElement("a");
            favButton.href = `favorites.php?id=${painting.PaintingID}`;
            favButton.classList.add("ui", "icon", "button");

            const favIcon = document.createElement("i");
            favIcon.classList.add("heart", "icon");
            favButton.appendChild(favIcon);

            extraDiv.appendChild(cartButton);
            extraDiv.appendChild(favButton);

            contentDiv.appendChild(headerLink);
            contentDiv.appendChild(metaDiv);
            contentDiv.appendChild(descriptionDiv);
            contentDiv.appendChild(costMeta);
            contentDiv.appendChild(extraDiv);

            listItem.appendChild(imageLink);
            listItem.appendChild(contentDiv);

            targetElement.appendChild(listItem);
        });

    } catch (error) {
        console.error(`Error loading content for target ID "${targetId}":`, error);
    }
}


async function populateImageLocation(targetId, paintingId, queryHandler) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    // Remove the old painting
    while (targetElement.firstChild) {
        targetElement.removeChild(targetElement.firstChild);
    }

    const query = {
        tables: "paintings",
        columns: ["Title", "ImageFileName", "Description"],
        where: `PaintingID=${paintingId}`
    };

    const data = await queryHandler(query);

    // Ensure data is in expected format and contains the painting data
    if (!Array.isArray(data) || data.length === 0) {
        console.warn(`Unexpected or empty data format for ${JSON.stringify(query)}:`, data);
        return;
    }

    const painting = data[0];

    // Create image element for the artwork
    const artworkImg = document.createElement("img");
    artworkImg.src = `./images/art/works/medium/${painting.ImageFileName}.jpg`;
    //artworkImg.alt = painting.Title;
    artworkImg.alt = "...";
    artworkImg.classList.add("ui", "big", "image");
    artworkImg.id = "artwork";

    // Create modal structure
    const modalDiv = document.createElement("div");
    modalDiv.classList.add("ui", "fullscreen", "modal");

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("image", "content");

    const largeImg = document.createElement("img");
    largeImg.src = `./images/art/works/medium/${painting.ImageFileName}.jpg`;
    //largeImg.alt = painting.Title;
    largeImg.alt = "...";
    largeImg.classList.add("image");

    const descriptionDiv = document.createElement("div");
    descriptionDiv.classList.add("description");

    const descriptionParagraph = document.createElement("p");
    descriptionParagraph.textContent = painting.Description || "Artwork description not available"; 
    descriptionDiv.appendChild(descriptionParagraph);

    contentDiv.appendChild(largeImg);
    contentDiv.appendChild(descriptionDiv);

    modalDiv.appendChild(contentDiv);

    targetElement.appendChild(artworkImg);
    targetElement.appendChild(modalDiv);
}


async function populateImageTitleDetails(targetId, paintingId, queryHandler) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    // Remove the old painting
    while (targetElement.firstChild) {
        targetElement.removeChild(targetElement.firstChild);
    }

    const query = {
        tables: "paintings",
        columns: ["Title", "ImageFileName", "Description"],
        where: `PaintingID=${paintingId}`
    };

    const data = await queryHandler(query);

    // Ensure data is in expected format and contains the painting data
    if (!Array.isArray(data) || data.length === 0) {
        console.warn(`Unexpected or empty data format for ${JSON.stringify(query)}:`, data);
        return;
    }

    const painting = data[0];

    const itemDiv = document.createElement('div');
    itemDiv.classList.add('item');

    const title = document.createElement('h2');
    title.classList.add('header');
    title.textContent = 'The Anatomy Lesson of Dr. Nicolaes Tulp';

    const artist = document.createElement('h3');
    artist.textContent = 'Rembrandt';

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('meta');

    const starRating = document.createElement('p');
    for (let i = 0; i < 4; i++) {
        const star = document.createElement('i');
        star.classList.add('orange', 'star', 'icon');
        starRating.appendChild(star);
    }
    const emptyStar = document.createElement('i');
    emptyStar.classList.add('empty', 'star', 'icon');
    starRating.appendChild(emptyStar);

    const description = document.createElement('p');
    description.innerHTML = `<em>The Anatomy Lesson of Dr. Nicolaes Tulp</em> is a 1632 oil painting by Rembrandt housed in the Mauritshuis museum in The Hague, the Netherlands.`;

    metaDiv.appendChild(starRating);
    metaDiv.appendChild(description);

    itemDiv.appendChild(title);
    itemDiv.appendChild(artist);
    itemDiv.appendChild(metaDiv);

    targetElement.appendChild(itemDiv);
}

