const testData = [
  { index: 1, score: 125 },
  { index: 2, score: 132 },
  { index: 3, score: 140 },
  { index: 4, score: 148 }
];

const createTOPIKGraph = (data) => {
  console.log('Input data:', data);
  if (!data || data.length === 0) {
    console.log('No data, returning empty string');
    return '';
  }
  
  const width = 600;
  const height = 250;
  
  console.log('Creating SVG with width:', width, 'height:', height);
  
  return `<svg width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="lightblue"/>
    <text x="10" y="20">Test Graph with ${data.length} points</text>
  </svg>`;
};

const result = createTOPIKGraph(testData);
console.log('Result length:', result.length);
console.log('Result preview:', result.substring(0, 100));

// Test with empty data
const emptyResult = createTOPIKGraph([]);
console.log('Empty result:', emptyResult);

// Test with undefined
const undefinedResult = createTOPIKGraph(undefined);
console.log('Undefined result:', undefinedResult);