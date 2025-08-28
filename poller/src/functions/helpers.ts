export async function getKVMonitors( namespace: KVNamespace, key: string): Promise<any> {
  // trying both to see performance difference
  //@ts-ignore
  //return (KV_STATUS_PAGE as KVNamespace).get(key, 'json')
  //return this.env.KV_STATUS_PAGE.get(key, 'json')
  return namespace.get(key, 'json')

  //return JSON.parse(await KV_STATUS_PAGE.get(kvDataKey, 'text'))
}

export async function setKVMonitors(env,key: string, data: any) {
  return setKV(env,key, JSON.stringify(data))
}

export async function md5(message) {
      return Array.from(
        new Uint8Array(
          await crypto.subtle.digest({name: "MD5"}, new TextEncoder().encode(message))
        ),
        (byte) => byte.toString(16).padStart(2, '0')
      ).join('');
    }


export async function setKV(namespace: KVNamespace,key: string, value: string, metadata?: any | null, expirationTtl?: number) {

  //@ts-ignore
  //return (KV_STATUS_PAGE as KVNamespace).put(key, value, { metadata, expirationTtl })
  //return this.env.KV_STATUS_PAGE.put(key, value, { metadata, expirationTtl })
  return namespace.put(key, value, { metadata, expirationTtl })

}

export async function getCheckLocation() {
  const res = await fetch('https://cloudflare-dns.com/dns-query', {
    method: 'OPTIONS',
  })
  return res.headers.get('cf-ray')!.split('-')[1]
}
