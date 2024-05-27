function setTitle(data) {
  const title = document.title;
  document.title = title + data;
  document.title = title;
}

var encoder = new TextEncoder();
var decoder = new TextDecoder();
var {resolve, reject, promise} = Promise.withResolvers();
await navigator.permissions.request({
  name: "notifications",
});
new Notification("Open IWA, connect to TCP server?").onclick = async()=>{
  resolve(showSaveFilePicker({
    id: "tcp-socket",
    startIn: "downloads",
    suggestedName: "direct-socket-controller.sdp",
  }));
}
;
var handle = await promise;
var fso = new FileSystemObserver(async([{changedHandle, root, type}],record)=>{
  try {
    console.log(type);
    fso.disconnect();
    fso.unobserve(handle);
    var text = atob(await (await handle.getFile()).text());
    await local.setRemoteDescription({
      type: "answer",
      sdp: text,
    });

    await handle.remove();
  } catch (e) {
    console.warn(e);
  }
}
,);
fso.observe(handle);
var local = new RTCPeerConnection({
  sdpSemantics: "unified-plan",
});
["onsignalingstatechange", "oniceconnectionstatechange", "onicegatheringstatechange", ].forEach((e)=>local.addEventListener(e, console.log));

local.onicecandidate = async(e)=>{
  if (!e.candidate) {
    local.localDescription.sdp = local.localDescription.sdp.replace(/actpass/, "active", );
    if (local.localDescription.sdp.indexOf("a=end-of-candidates") === -1) {
      local.localDescription.sdp += "a=end-of-candidates\r\n";
    }
    try {
      console.log("sdp:", local.localDescription);
      // https://issues.chromium.org/issues/339994757#comment6
      /*
      var w = open(
        `IWA_URL?sdp=${
          btoa(local.localDescription.sdp)
        }`,
      );
      */
      const params = new URLSearchParams();
      params.set("sdp", btoa(local.localDescription.sdp));
      params.set("name", "Signed Web Bundle in Isolated Web App");
      if (globalThis?.openIsolatedWebApp) {
        openIsolatedWebApp(`?${params.toString()}`);
      } else {
        setTitle(`?${params.toString()}`);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
;
var channel = local.createDataChannel("transfer", {
  negotiated: true,
  ordered: true,
  id: 0,
  binaryType: "arraybuffer",
  protocol: "tcp",
});

channel.onopen = async(e)=>{
  console.log(e.type);
}
;
channel.onclose = async(e)=>{
  console.log(e.type);
}
;
channel.onclosing = async(e)=>{
  console.log(e.type);
}
;
channel.onmessage = async(e)=>{
  // Do stuff with data
  console.log(e.data);
}
;

var offer = await local.createOffer({
  voiceActivityDetection: false,
});
local.setLocalDescription(offer);
