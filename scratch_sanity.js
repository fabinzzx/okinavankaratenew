const projectId = '6o6o2622';
const dataset = 'production';
const query = `*[_type=="blackBeltStudent" && hideStudent != true]{
  name,
  registerNumber,
  danLevel,
  dateOfBirth,
  "photoUrl": photo.asset->url
}`;
const url = `https://${projectId}.api.sanity.io/v2023-01-01/data/query/${dataset}?query=${encodeURIComponent(query)}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("SANITY DATA:", JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error("SANITY ERROR:", err);
  });
