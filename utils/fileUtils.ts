// src/utils/fileDownloader.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

/**
 * Attempts to save a JSON string to a file, prompting the user
 * to choose the save location and filename via the native sharing mechanism.
 * On web, it triggers a direct download.
 *
 * @param suggestedFilename - The initial filename suggested to the user (e.g., "mydata.json").
 * @param jsonString - The JSON string content to save.
 */
export const saveJsonFileWithPicker = async (suggestedFilename: string, jsonString: string): Promise<void> => {
    if (Platform.OS === 'web') {
        // --- Web: Direct Download ---
        try {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = suggestedFilename; // Use the suggested filename
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`Web: File '${suggestedFilename}' download initiated.`);
        } catch (error) {
            console.error('Web download error:', error);
            Alert.alert('Download Error', 'Could not download the file on web.');
        }
    } else {
        // --- Mobile (iOS & Android): Save to a temporary file and then Share ---
        // Using cacheDirectory for temporary storage before sharing.
        // User will choose the final destination and can rename.
        const fileUri = FileSystem.cacheDirectory + suggestedFilename;

        try {
            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            console.log(`Temporary file saved to: ${fileUri}`);

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Saving Not Available', 'Unable to save or share the file on this device.');
                // You could provide the fileUri here for debugging if needed,
                // but users generally can't access cacheDirectory directly.
                return;
            }

            // The Sharing dialog will allow the user to "Save to Files" (iOS)
            // or choose a file manager app (Android) to save the file.
            // The user can typically rename the file in the system's save dialog.
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json', // Helps Android suggest appropriate apps
                dialogTitle: `Save ${suggestedFilename} As...`, // Title for the share dialog
                UTI: 'public.json', // Uniform Type Identifier for iOS
            });
            console.log(`Sharing dialog presented for: ${fileUri}`);

            // Note: After sharing, you might want to delete the temporary file from cache,
            // but it's often fine to let the OS manage cache cleanup.
            // If you want to delete:
            // setTimeout(async () => {
            //   try {
            //     await FileSystem.deleteAsync(fileUri, { idempotent: true });
            //     console.log(`Temporary file deleted: ${fileUri}`);
            //   } catch (deleteError) {
            //     console.error('Error deleting temporary file:', deleteError);
            //   }
            // }, 5000); // Delete after 5 seconds (giving time for sharing to complete)

        } catch (error) {
            console.error('Error preparing or sharing file:', error);
            Alert.alert('Save Error', `Could not save the file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};