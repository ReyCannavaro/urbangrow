export interface AnalysisResult {
  tempStatus: string;
  phStatus: string;
  conclusion: string;
  dynamicBorderColor: string;
}

export const analyzeWaterCondition = (temp: number, ph: number): AnalysisResult => {
  let tempStatus = '';
  let phStatus = '';
  let dynamicBorderColor = '#10b981';

  if (temp > 32) {
    tempStatus = 'Terlalu Panas';
    dynamicBorderColor = '#ef4444';
  } else if (temp >= 28) {
    tempStatus = 'Panas';
    dynamicBorderColor = '#f59e0b';
  } else if (temp >= 20) {
    tempStatus = 'Hangat';
    dynamicBorderColor = '#10b981';
  } else if (temp >= 15) {
    tempStatus = 'Dingin';
    dynamicBorderColor = '#f59e0b';
  } else {
    tempStatus = 'Sangat Dingin';
    dynamicBorderColor = '#3b82f6';
  }

  const tempDynamicColor = dynamicBorderColor;

  if (ph >= 6 && ph <= 7.5) {
    phStatus = 'Ideal (Netral)';
  } else if (ph < 6) {
    phStatus = 'Asam';
    if (tempDynamicColor !== '#ef4444') {
      dynamicBorderColor = '#f59e0b';
    }
  } else {
    phStatus = 'Basa (Alkaline)';
    if (tempDynamicColor !== '#ef4444') {
      dynamicBorderColor = '#f59e0b';
    }
  }

  let conclusion = `Kondisi air saat ini ${tempStatus} (${temp.toFixed(1)}°C) dan pH ${ph.toFixed(2)} (${phStatus}).`;

  if (tempStatus === 'Hangat' && phStatus === 'Ideal (Netral)') {
    conclusion = 'Kondisi air saat ini sangat OPTIMAL. Pertahankan level ini.';
  } else if (tempStatus === 'Sangat Dingin' || tempStatus === 'Terlalu Panas') {
    conclusion += ' Suhu air TIDAK ideal. Perlu penyesuaian untuk menjaga kesehatan ikan dan tanaman.';
    dynamicBorderColor = '#ef4444';
  } else if (phStatus !== 'Ideal (Netral)') {
    conclusion += ' Kualitas pH air perlu dikoreksi.';
  } else {
    conclusion += ' Kondisi Suhu dan pH berada di batas aman.';
  }

  return { tempStatus, phStatus, conclusion, dynamicBorderColor };
};
