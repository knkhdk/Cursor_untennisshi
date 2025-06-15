// スプレッドシートのIDを設定
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // ここにスプレッドシートのIDを入力してください

// Webアプリケーションとしてデプロイするための関数
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('運転日誌')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 運転日誌を保存する関数
function saveDrivingLog(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getActiveSheet();
    
    // データを配列として準備
    const rowData = [
      formData.date,
      formData.startDistance,
      formData.startTime,
      formData.destination,
      new Date() // 記録日時
    ];
    
    // シートにデータを追加
    sheet.appendRow(rowData);
    
    return { success: true };
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    throw new Error('データの保存に失敗しました: ' + error.toString());
  }
}

// スプレッドシートのURLを取得する関数
function getSpreadsheetUrl() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return ss.getUrl();
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    throw new Error('スプレッドシートのURL取得に失敗しました: ' + error.toString());
  }
} 