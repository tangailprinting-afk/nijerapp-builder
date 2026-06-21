class FrameworkDB {


static async save(
    collection,
    data
) {

    return await
    window.frameworkAPI
    .saveData(
        collection,
        data
    );

}

static async get(
    collection
) {

    return await
    window.frameworkAPI
    .getData(
        collection
    );

}

static async update(
    collection,
    id,
    data
) {

    return await
    window.frameworkAPI
    .updateData(
        collection,
        id,
        data
    );

}

static async delete(
    collection,
    id
) {

    return await
    window.frameworkAPI
    .deleteData(
        collection,
        id
    );

}


static async count(
    collection
) {

    return await
    window.frameworkAPI
    .countData(
        collection
    );

}


static async search(
collection,
keyword
) {


return await
window.frameworkAPI
.searchData(
    collection,
    keyword
);


}






}


window.FrameworkDB =
FrameworkDB;
