// src/utils/fileDownloader.ts
import *
as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as RNFS from 'react-native-fs'
import { Platform, Alert } from 'react-native';

/**
 * Saves a JSON string to a temporary file in the app's cache directory
 * and then prompts the user to share/save it.
 * On web, it attempts a direct download.
 *
 * @param filename - The desired filename (e.g., "mydata.json").
 * @param jsonString - The JSON string content to save.
 */
export const downloadJsonFile = async (filename: string, jsonString: string): Promise<void> => {
    if (Platform.OS === 'web') {
        // --- Web: Direct Download ---
        try {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a); // Required for Firefox
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`Web: File '${filename}' download initiated.`);
        } catch (error) {
            console.error('Web download error:', error);
            Alert.alert('Download Error', 'Could not download the file on web.');
        }
    } else {
        // --- Mobile (iOS & Android): Save to Cache and Share ---
        // Construct a path in the app's cache directory
        const fileUri = FileSystem.cacheDirectory + filename;

        try {
            // Write the string to the file
            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            console.log(`File saved to: ${fileUri}`);

            // Check if sharing is available
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Sharing Error', 'Sharing is not available on this device.');
                // Optionally, you could inform the user where the file is saved within the app's cache
                // if they have a way to access it (e.g., through a file manager for dev purposes).
                // On a real device, app cache is not user-accessible directly.
                console.log(`File is in app cache: ${fileUri}. User may need to use Share option manually if available elsewhere.`);
                return;
            }

            // Share the file
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json', // Important for Android to know the file type
                dialogTitle: `Save or Share ${filename}`, // Optional title for the sharing dialog
                UTI: 'public.json', // Uniform Type Identifier for iOS
            });
            console.log(`Sharing dialog opened for: ${fileUri}`);

        } catch (error) {
            console.error('Error saving or sharing file:', error);
            Alert.alert('Error', `Could not save or share the file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

/**
 * (Alternative for Android if you want to try MediaStore - More Complex)
 * This is a more advanced approach for Android 10+ to save directly to Downloads.
 * It requires more setup and potentially more permissions depending on the exact
 * implementation details and target Android SDK.
 * For simplicity and cross-platform consistency, the Sharing API is generally preferred.
 */
export const downloadJsonFileToDownloadsAndroid = async (filename: string, jsonString: string): Promise<void> => {
    if (Platform.OS !== 'android') {
        console.warn('downloadJsonFileToDownloadsAndroid is only for Android.');
        // Fallback to sharing for other platforms or implement their specific save methods
        await downloadJsonFile(filename, jsonString);
        return;
    }

    // This requires careful handling of permissions and MediaStore API.
    // Example using FileSystem (might save to app-specific external storage, not shared Downloads without SAF or MediaStore).

    // For Android 10 (API 29) and above, you'd ideally use MediaStore.
    // For below Android 10, you might need WRITE_EXTERNAL_STORAGE permission.

    // Simple approach: Save to app's external document directory (visible to user if they browse app files)
    // This is NOT the public "Downloads" folder but rather specific to your app in external storage.
    let fileUri = '';
    try {
        if (FileSystem.documentDirectory) {
            // Get a permission to a dir selected by the user
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(FileSystem.documentDirectory);
            if (!permissions.granted) {
                Alert.alert("Permission Denied", "Storage permission is required to save the file. Try sharing it.");
                return;
            }
            console.log('permitted ', permissions.directoryUri)
            // permitted dir uri
            const dirUri = permissions.directoryUri;
            // Create an empty file .json at the permitted dir
            const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                dirUri,
                filename,
                'application/json',
            );
            // Write the json content to this file
            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            Alert.alert('File Saved', `File saved to app's document folder: ${filename}. You might need to browse to it.`);
            console.log(`File saved to: ${fileUri}`);
        } else {
            // Alert.alert('Error', 'Document directory is not available.');
            throw new Error('Document directory is not available.');
        }
    } catch (error) {
        console.error('Android download error:', error);
        Alert.alert('Download Error', `Could not download the file: ${error instanceof Error ? error.message : String(error)}`);
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: `File ${filename} saved. Share it?`,
            });
        }
    }
};