class PeerService {
  constructor() {
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
        ],
      });
      this.dataChannel = null;
      this.fileChunks = [];
      this.filename = "";
      this.peer.ondatachannel = this.handleDataChannel.bind(this);
    }
  }

  createDataChannel() {
    this.dataChannel = this.peer.createDataChannel("fileTransfer");
    this.setupDataChannel();
  }

  setupDataChannel() {
    this.dataChannel.onopen = () => {
      console.log("Data channel is open");
    };

    this.dataChannel.onmessage = (event) => {
      const data = event.data;
      if (typeof data === "string") {
        if (data === "end") {
          this.saveFile();
        } else {
          this.filename = data;
        }
      } else {
        this.fileChunks.push(data);
      }
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel is closed");
    };
  }

  handleDataChannel(event) {
    this.dataChannel = event.channel;
    this.setupDataChannel();
  }

  saveFile() {
    const blob = new Blob(this.fileChunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = this.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.fileChunks = [];
    this.filename = "";
  }

  async getAnswer(offer) {
    if (this.peer) {
      await this.peer.setRemoteDescription(offer);
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      return ans;
    }
  }

  async setLocalDescription(ans) {
    if (this.peer) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
    }
  }

  async getOffer() {
    if (this.peer) {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      return offer;
    }
  }

  sendFile(file) {
    const chunkSize = 16 * 1024;
    const reader = new FileReader();
    let offset = 0;

    this.dataChannel.send(file.name);

    reader.onload = (event) => {
      const chunk = event.target.result;
      this.sendChunk(chunk, offset, file.size);
      offset += chunkSize;
      if (offset < file.size) {
        readSlice(offset);
      } else {
        this.dataChannel.send("end");
      }
    };

    const readSlice = (o) => {
      const slice = file.slice(offset, o + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  }

  sendChunk(chunk, offset, fileSize) {
    if (
      this.dataChannel.bufferedAmount >
      this.dataChannel.bufferedAmountLowThreshold
    ) {
      setTimeout(() => this.sendChunk(chunk, offset, fileSize), 100);
    } else {
      this.dataChannel.send(chunk);
    }
  }
}

export default new PeerService();
