# Expo tunnel requires HTTPS to api.expo.dev and ngrok. On machines with SSL
# inspection (antivirus/corporate proxy), Node fails with "unable to verify the
# first certificate". This script applies a local-only TLS workaround for the
# dev server process, then starts the tunnel.
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
& expo start --tunnel @args
