import {getCookieStore, getAuthConfig} from './utils';


export async function showDebugInfo(){
    const debugOutputContainer = document.getElementById('debugOutput');
    const debugLoading = document.getElementById('debugLoading');

    debugLoading.classList.remove('d-none');

    let debugLines = [];
    
    const cookieStoreId = await getCookieStore();
    debugLines.push('CookieStoreId: ' + cookieStoreId);

    const authConfig = await getAuthConfig(cookieStoreId);
    debugLines.push('AuthConfig:');
    debugLines.push(JSON.stringify(authConfig, null, 2));

    debugOutputContainer.textContent = debugLines.join('\n');

    debugLoading.classList.add('d-none');
}