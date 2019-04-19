class StreamHandlers {
  constructor() {

  }

  async listenStream(event: any) {
    console.log('--- event ---', JSON.stringify(event, null, ' '));
  }
}

export default StreamHandlers;
