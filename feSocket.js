<html>
	<body>
		<script type="text/javascript">
			var ws = new WebSocket("ws://" + window.location.hostname + ":serverPort");

			// Wait for request
			ws.onmessage = function(e){

				// Trigger request
				if( typeof window.callPhantom === 'function' ){
					callPhantom(e.data);
				}else{
					// Report error
					ws.send(JSON.stringify({ type: "error", message: "callPhantom not declared" }));
				}
			};
		</script>
	</body>
</html>