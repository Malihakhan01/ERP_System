import http from "http";

async function testAdminInspect() {
  const postData = JSON.stringify({
    senderId: "2", // maliha
    targetUserId: "3", // Ayesha Siddiqui
  });

  const req = http.request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/chat/conversations",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.log("Locate Conv Response:", data);
        const json = JSON.parse(data);
        if (json.conversationId) {
          http.get(`http://localhost:3000/api/chat/messages?conversationId=${json.conversationId}`, (mRes) => {
            let mData = "";
            mRes.on("data", (c) => (mData += c));
            mRes.on("end", () => {
              console.log("\nMessages in thread", json.conversationId, ":");
              console.log(JSON.parse(mData));
            });
          });
        }
      });
    }
  );

  req.write(postData);
  req.end();
}

testAdminInspect();
