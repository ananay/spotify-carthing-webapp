export const getBacktraceUuid = (chunk) => {
    const values = { '/static/js/main.js.map': '090B7AD2-3F0F-5455-C363-9BE8D92D94E9' };
    let uuid = values[chunk];
    if (uuid === undefined) uuid = values[Object.keys(values)[0]];
    return uuid;
  };
  