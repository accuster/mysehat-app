// utils/partnerStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  BMI_RECORDS: '@partner_bmi_records',
  LAST_RECORD_ID: '@partner_last_record_id',
};

export interface BMIRecord {
  id: string;
  height: string;
  weight: string;
  bmi: string;
  bmiStatus: string;
  
  // Extended health metrics (matching database trigger)
  idealWeight: string;
  bodyFatPercentage: string;
  fatMass: string;
  leanBodyMass: string;
  healthScore: string;
  
  // Patient demographics
  gender: string;
  age: string;
  name: string;
  mobile: string;
  
  // Metadata
  dataSource: 'bluetooth' | 'qr';
  machineId?: string;
  timestamp: string;
  createdAt: string;
}

/**
 * Generate unique record ID
 */
async function generateRecordId(): Promise<string> {
  try {
    const lastId = await AsyncStorage.getItem(STORAGE_KEYS.LAST_RECORD_ID);
    const nextId = lastId ? parseInt(lastId, 10) + 1 : 1;
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_RECORD_ID, nextId.toString());
    return `BMI-${Date.now()}-${nextId}`;
  } catch (error) {
    console.log('Error generating record ID:', error);
    return `BMI-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Save a new BMI record
 */
export async function saveBMIRecord(record: Omit<BMIRecord, 'id' | 'createdAt'>): Promise<BMIRecord> {
  try {
    const id = await generateRecordId();
    const createdAt = new Date().toISOString();
    
    const newRecord: BMIRecord = {
      ...record,
      id,
      createdAt,
    };

    // Get existing records
    const records = await getAllBMIRecords();
    
    // Add new record to the beginning
    records.unshift(newRecord);
    
    // Save back to storage
    await AsyncStorage.setItem(STORAGE_KEYS.BMI_RECORDS, JSON.stringify(records));
    
    console.log('✅ BMI record saved successfully:', id);
    console.log('📊 Total records:', records.length);
    
    return newRecord;
  } catch (error) {
    console.log('❌ Error saving BMI record:', error);
    throw error;
  }
}

/**
 * Get all BMI records (sorted by newest first)
 */
export async function getAllBMIRecords(): Promise<BMIRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BMI_RECORDS);
    if (!data) {
      return [];
    }
    
    const records = JSON.parse(data) as BMIRecord[];
    return records;
  } catch (error) {
    console.log('❌ Error getting BMI records:', error);
    return [];
  }
}

/**
 * Get a single BMI record by ID
 */
export async function getBMIRecordById(id: string): Promise<BMIRecord | null> {
  try {
    const records = await getAllBMIRecords();
    return records.find(record => record.id === id) || null;
  } catch (error) {
    console.log('❌ Error getting BMI record by ID:', error);
    return null;
  }
}

/**
 * Delete a BMI record by ID
 */
export async function deleteBMIRecord(id: string): Promise<boolean> {
  try {
    const records = await getAllBMIRecords();
    const filteredRecords = records.filter(record => record.id !== id);
    
    if (filteredRecords.length === records.length) {
      console.log('⚠️ Record not found:', id);
      return false;
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.BMI_RECORDS, JSON.stringify(filteredRecords));
    console.log('✅ BMI record deleted:', id);
    return true;
  } catch (error) {
    console.log('❌ Error deleting BMI record:', error);
    return false;
  }
}

/**
 * Update an existing BMI record
 */
export async function updateBMIRecord(id: string, updates: Partial<BMIRecord>): Promise<BMIRecord | null> {
  try {
    const records = await getAllBMIRecords();
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) {
      console.log('⚠️ Record not found for update:', id);
      return null;
    }
    
    records[index] = { ...records[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.BMI_RECORDS, JSON.stringify(records));
    
    console.log('✅ BMI record updated:', id);
    return records[index];
  } catch (error) {
    console.log('❌ Error updating BMI record:', error);
    return null;
  }
}

/**
 * Search BMI records by patient name or mobile
 */
export async function searchBMIRecords(query: string): Promise<BMIRecord[]> {
  try {
    const records = await getAllBMIRecords();
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return records;
    }
    
    return records.filter(record => {
      return (
        record.name.toLowerCase().includes(lowerQuery) ||
        record.mobile.includes(lowerQuery)
      );
    });
  } catch (error) {
    console.log('❌ Error searching BMI records:', error);
    return [];
  }
}

/**
 * Get BMI records count
 */
export async function getBMIRecordsCount(): Promise<number> {
  try {
    const records = await getAllBMIRecords();
    return records.length;
  } catch (error) {
    console.log('❌ Error getting BMI records count:', error);
    return 0;
  }
}

/**
 * Clear all BMI records (use with caution)
 */
export async function clearAllBMIRecords(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.BMI_RECORDS);
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_RECORD_ID);
    console.log('✅ All BMI records cleared');
    return true;
  } catch (error) {
    console.log('❌ Error clearing BMI records:', error);
    return false;
  }
}

/**
 * Export BMI records as JSON string (for backup)
 */
export async function exportBMIRecords(): Promise<string> {
  try {
    const records = await getAllBMIRecords();
    return JSON.stringify(records, null, 2);
  } catch (error) {
    console.log('❌ Error exporting BMI records:', error);
    throw error;
  }
}

/**
 * Import BMI records from JSON string (for restore)
 */
export async function importBMIRecords(jsonData: string): Promise<number> {
  try {
    const records = JSON.parse(jsonData) as BMIRecord[];
    
    // Validate records
    if (!Array.isArray(records)) {
      throw new Error('Invalid data format');
    }
    
    // Get existing records
    const existingRecords = await getAllBMIRecords();
    
    // Merge records (avoid duplicates by ID)
    const existingIds = new Set(existingRecords.map(r => r.id));
    const newRecords = records.filter(r => !existingIds.has(r.id));
    
    const mergedRecords = [...existingRecords, ...newRecords];
    
    // Sort by createdAt (newest first)
    mergedRecords.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    await AsyncStorage.setItem(STORAGE_KEYS.BMI_RECORDS, JSON.stringify(mergedRecords));
    
    console.log('✅ Imported', newRecords.length, 'new records');
    return newRecords.length;
  } catch (error) {
    console.log('❌ Error importing BMI records:', error);
    throw error;
  }
}

/**
 * Get statistics for BMI records
 */
export async function getBMIStatistics(): Promise<{
  totalRecords: number;
  totalPatients: number; // unique mobile numbers
  bluetoothRecords: number;
  qrRecords: number;
  averageBMI: number;
  bmiCategories: {
    underweight: number;
    normal: number;
    overweight: number;
    obese: number;
  };
}> {
  try {
    const records = await getAllBMIRecords();
    
    const uniqueMobiles = new Set(records.map(r => r.mobile));
    const bluetoothRecords = records.filter(r => r.dataSource === 'bluetooth').length;
    const qrRecords = records.filter(r => r.dataSource === 'qr').length;
    
    const totalBMI = records.reduce((sum, r) => sum + parseFloat(r.bmi || '0'), 0);
    const averageBMI = records.length > 0 ? totalBMI / records.length : 0;
    
    const bmiCategories = {
      underweight: 0,
      normal: 0,
      overweight: 0,
      obese: 0,
    };
    
    records.forEach(record => {
      const bmi = parseFloat(record.bmi || '0');
      if (bmi < 18.5) {
        bmiCategories.underweight++;
      } else if (bmi >= 18.5 && bmi < 25) {
        bmiCategories.normal++;
      } else if (bmi >= 25 && bmi < 30) {
        bmiCategories.overweight++;
      } else if (bmi >= 30) {
        bmiCategories.obese++;
      }
    });
    
    return {
      totalRecords: records.length,
      totalPatients: uniqueMobiles.size,
      bluetoothRecords,
      qrRecords,
      averageBMI: parseFloat(averageBMI.toFixed(1)),
      bmiCategories,
    };
  } catch (error) {
    console.log('❌ Error getting BMI statistics:', error);
    return {
      totalRecords: 0,
      totalPatients: 0,
      bluetoothRecords: 0,
      qrRecords: 0,
      averageBMI: 0,
      bmiCategories: {
        underweight: 0,
        normal: 0,
        overweight: 0,
        obese: 0,
      },
    };
  }
}
