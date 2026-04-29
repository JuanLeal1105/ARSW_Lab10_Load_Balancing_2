# **Laboratorio 10 - Load Balancing Parte 2**

**Escuela Colombiana de Ingeniería Julio Garavito**  
Arquitectura de Software — ARSW | Abril 2026

**Elaborado por**  
Juan Carlos Leal Cruz

## **Generalidades del Lab**
### **Prerrequisitos**
Para la correcta ejecución de este laboratorio se debe de contar con lo siguient:
- Node.js 18+
- Azure CLI con sesión activa (`az login`)
- Azure Functions Core Tools v4: `npm install -g azure-functions-core-tools@4`
- Newman: `npm install -g newman`
- Function App desplegado en Azure (plan Consumption)
  
### **Estructura del repositorio**
```
ARSW_Lab10_Load_Balancing/
├── FunctionProject/
│   ├── Fibonacci/              # Función iterativa original
│   │   ├── index.js
│   │   └── function.json
│   ├── FibonacciMemo/          # Función con memoization (nueva)
│   │   ├── index.js
│   │   └── function.json
│   ├── host.json
│   └── package.json
└── newman-collection/          # Pruebas concurrentes
    ├── fibonacci-collection.json
    └── run-concurrent.js
```
---
## **Parte 1. Prueba concurrente con Newman**
### **1. Instalar dependencias del runner**
```bash
cd newman-collection
npm install newman
```

### **2. Ejecutar 10 peticiones concurrentes**
El script `run-concurrent.js` dispara 10 Promises simultáneas con `Promise.all()`, cada una ejecutando una corrida de Newman contra `/api/Fibonacci`. El valor `nth` se pasa como variable de entorno a la colección, reemplazando `{{nthValue}}` en el body del request.

```bash
node run-concurrent.js --url https://functionfibonacciapp-awbcgkewbagwbwh0.eastus2-01.azurewebsites.net

# También se puede especificar nth explícitamente:
node run-concurrent.js --url https://<APP>.azurewebsites.net --nth 1000000
```

Al ejecutar estos comandos, la terminal registrará en tiempo real el resultado individual de cada una de las 10 peticiones concurrentes a medida que la infraestructura en la nube las procese. Una vez que todas las promesas concluyen, el script imprime un reporte estadístico consolidado que detalla la cantidad de ejecuciones exitosas y fallidas, junto con los tiempos de respuesta mínimo, máximo y promedio, entregando una visión clara del rendimiento de la función bajo estrés.

### **3. Intepretar los resultados**
- Cada línea muestra `✓`/`✗`, número de request, HTTP status y tiempo de respuesta.
- El resumen final reporta: total, exitosos, fallidos, wall-clock y estadísticas de tiempo.
- Wall-clock ≈ petición más lenta (no la suma), lo que confirma ejecución paralela real.

## **Parte 2. FibonacciMemo - Función con Memorización**
### **1. `index.js` y `function.json`**
El archivo de configuración JSON actúa como el contrato de comunicación de la API. Define un desencadenador HTTP público con autorización anónima, permitiendo que el endpoint reciba peticiones GET y POST sin requerir credenciales. Asimismo, establece el canal de salida para asegurar que el sistema devuelva una respuesta HTTP estructurada al cliente tras finalizar el procesamiento.

El script principal en Node.js maneja las solicitudes y ejecuta la lógica matemática apoyándose en la librería big-integer para procesar cifras masivas sin perder precisión. El cálculo numérico se realiza mediante un algoritmo iterativo, diseñado específicamente para reemplazar la recursividad tradicional y evitar desbordamientos en la pila de llamadas (stack overflow) al evaluar posiciones extremadamente altas dentro de la secuencia.

La máxima eficiencia del sistema radica en su estrategia de caché persistente, o memoización, implementada a nivel de módulo. Al mantener un historial de resultados en memoria entre distintas ejecuciones, el algoritmo retoma los cálculos de nuevas peticiones desde el último valor conocido en lugar de empezar desde cero, reduciendo drásticamente la carga de procesamiento antes de retornar el enorme número resultante junto con sus métricas de diagnóstico.

### **2. Redesplegar a Azure**
Como esta funcion es un nuevo añadido al proyecto, se debe de hacer lo sq¿iguiente:
```bash
cd FunctionProject
func azure functionapp publish functionfibonacciapp-awbcgkewbagwbwh0
```

Azure detecta automáticamente todas las subcarpetas con `function.json` y registra ambas funciones.

### **3. Verificar en el portal**
En `portal.azure.com` dentro del Function App creada deben de aparecer ambas funciones: `Fibonacci` y `FibonacciMemo`.

### **4. Secuencia de pruebas**
```bash
# 1. Primera llamada — instancia fría, cache vacío
curl -X POST https://<APP>.azurewebsites.net/api/FibonacciMemo \
  -H "Content-Type: application/json" \
  -d '{"nth": 100000}'
# Esperado: "cacheHit": false

# 2. Segunda llamada inmediata — instancia caliente, cache hit
# Repetir el mismo curl
# Esperado: "cacheHit": true, tiempo < 10 ms

# 3. Esperar 5+ minutos sin actividad

# 4. Tercera llamada — instancia reciclada, cache perdido
# Repetir el mismo curl
# Esperado: "cacheHit": false nuevamente
```

De igual forma dentro del mismo portal de azure se pueden realizar estas mismas pruebas usando la parte `Test/Run` dentro de la función y se verán reflejados los mismos resultados.
