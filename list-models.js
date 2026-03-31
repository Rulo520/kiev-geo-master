
async function listModels() {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.error("Uso: node list-models.js TU_API_KEY");
    process.exit(1);
  }

  const versions = ['v1', 'v1beta'];
  
  for (const v of versions) {
    console.log(`\n--- Probando versión ${v} ---`);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`);
      const data = await resp.json();
      
      if (data.models) {
        console.log(`Modelos encontrados en ${v}:`);
        data.models.forEach(m => {
          console.log(` - ${m.name} (vía ${v})`);
        });
      } else {
        console.log(`No se encontraron modelos en ${v}. Error:`, JSON.stringify(data));
      }
    } catch (e) {
      console.log(`Error conectando a ${v}:`, e.message);
    }
  }
}

listModels();
