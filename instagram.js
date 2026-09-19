const graph = (config, path) => `https://graph.facebook.com/${config.instagramApiVersion}/${path}`;

function requireInstagram(config) {
  if (!config.instagramAccessToken || !config.instagramUserId) throw new Error("Instagram is not configured");
}

async function graphRequest(config, path, options = {}) {
  requireInstagram(config);
  const response = await fetch(graph(config, path), {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}), authorization: `Bearer ${config.instagramAccessToken}` }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(`Instagram Graph API failed (${response.status}): ${body.error?.message || "unknown error"}`);
  return body;
}

async function status(config) {
  if (!config.instagramAccessToken || !config.instagramUserId) return { connected: false };
  try {
    const body = await graphRequest(config, `${config.instagramUserId}?fields=username,account_type`);
    return { connected: true, username: body.username || config.instagramUserId, accountType: body.account_type };
  } catch (error) { return { connected: false, error: error.message }; }
}

async function publish(item, config) {
  const creation = await graphRequest(config, `${config.instagramUserId}/media`, {
    method: "POST", body: JSON.stringify({ image_url: item.imageUrl, caption: item.caption || "" })
  });
  return graphRequest(config, `${config.instagramUserId}/media_publish`, {
    method: "POST", body: JSON.stringify({ creation_id: creation.id })
  });
}

module.exports = { status, publish };
