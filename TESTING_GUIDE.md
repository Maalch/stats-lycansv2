# 🧪 Testing Guide for Hybrid Data Pipeline

## Post-Deployment Checklist

### ✅ **1. GitHub Repository Setup**
- [ ] GitHub secret `LYCANS_API_BASE` is configured
- [ ] Repository has GitHub Pages enabled
- [ ] All files pushed to `main` branch
- [ ] Actions have necessary permissions (Contents: write)

### ✅ **2. GitHub Actions Testing**

#### **Manual Trigger Test**
1. Go to: `https://github.com/Maalch/stats-lycansv2/actions`
2. Click "Update Lycans Stats Data"
3. Click "Run workflow" → Select "main" → "Run workflow"
4. Watch the workflow execution
5. **Expected result**: New commit with updated data files

#### **Check Workflow Logs**
```
✅ Checkout repository
✅ Setup Node.js  
✅ Install dependencies
✅ Fetch and process data
✅ Commit and push if changes
```

### ✅ **3. Production Site Testing**

#### **Access Your Site**
- URL: `https://maalch.github.io/stats-lycansv2/`
- **Expected**: Site loads normally

#### **Test Static Data Loading**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for requests to:
   - `/stats-lycansv2/data/index.json` ✅
   - `/stats-lycansv2/data/campWinStats.json` ✅
   - Other data files as needed

#### **Test Data Freshness**
1. Check for "📊 Updated recently" indicator (if DataStatus component is added)
2. Or manually check: `https://maalch.github.io/stats-lycansv2/data/index.json`

### ✅ **4. API Fallback Testing**

#### **Test API Endpoints Still Work**
Open browser console and run:
```javascript
// Test direct API call
fetch('https://script.google.com/macros/s/AKfycbxo92hlxlcCzXtXawsxP4LSspOkNKKI4Yo8OC5aqrAe70EGoIaMcWtFWy7j-RF1iTiu/exec?action=campWinStats')
  .then(r => r.json())
  .then(data => console.log('API works:', data))
  .catch(err => console.error('API failed:', err));
```

#### **Test Hybrid System**
```javascript
// This should use static data first
fetch('/stats-lycansv2/data/campWinStats.json')
  .then(r => r.json())
  .then(data => console.log('Static data works:', data))
  .catch(err => console.error('Static data failed:', err));
```

### ✅ **5. Performance Testing**

#### **Compare Load Times**
1. **Before**: Note current page load time
2. **After**: Compare with hybrid system
3. **Expected**: Faster initial load, fewer API calls

#### **Monitor API Usage**
- Check Google Apps Script quotas
- **Expected**: Significant reduction in API calls

### ✅ **6. Error Handling Testing**

#### **Test Static Data Unavailable**
1. Temporarily remove a data file from GitHub
2. **Expected**: Site falls back to API gracefully
3. Restore the file

#### **Test API Unavailable**
1. Use invalid API URL in environment
2. **Expected**: Static data still works

## 🔍 **Debugging Common Issues**

### **Issue**: Static Data Not Loading
```
✅ Check: /data/index.json exists in repo
✅ Check: GitHub Pages is serving from correct branch
✅ Check: Build process copied data files
✅ Check: Browser console for fetch errors
```

### **Issue**: GitHub Action Fails
```
✅ Check: LYCANS_API_BASE secret is set correctly
✅ Check: Secret has no extra spaces/characters
✅ Check: API endpoint is accessible
✅ Check: Workflow has write permissions
```

### **Issue**: API Fallback Not Working**
```
✅ Check: Environment variable VITE_LYCANS_API_BASE is set
✅ Check: Apps Script deployment is active
✅ Check: CORS settings allow your domain
```

## 📊 **Success Metrics**

### **Immediate Benefits**
- [ ] Page load time improved
- [ ] Reduced API quota usage
- [ ] Data loads without API delays

### **Long-term Benefits**
- [ ] More reliable during high traffic
- [ ] Better user experience
- [ ] Reduced maintenance overhead

## 🚀 **Next Steps After Successful Testing**

1. **Monitor Performance**
   - Watch GitHub Actions daily execution
   - Monitor site performance metrics
   - Track API quota usage

2. **Optional Enhancements**
   - Add data compression
   - Implement incremental updates
   - Add more sophisticated caching

3. **Scale Planning**
   - Consider CDN integration
   - Plan database migration if needed
   - Implement advanced monitoring

## 📞 **Getting Help**

If something doesn't work:
1. Check GitHub Actions logs
2. Look at browser console errors
3. Verify all environment variables
4. Test API endpoints manually
5. Check GitHub Pages configuration
