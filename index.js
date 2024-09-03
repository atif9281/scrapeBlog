const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
// const fs = require('fs');

const scrapeTechCrunch = async () => {
    // Launch the browser
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Function to scrape articles from the current page
        const scrapeCurrentPage = async () => {
            return await page.evaluate(() => {
                const articleElements = document.querySelectorAll('.wp-block-tc23-post-picker');
                const articleList = [];
                articleElements.forEach(article => {
                    const titleElement = article.querySelector('h2.wp-block-post-title a');
                    const authorElement = article.querySelector('a[href*="/author/"]');
                    const timeElement = article.querySelector('time');
                    const descriptionElement = article.querySelector('p.wp-block-post-excerpt__excerpt');
                    const imageElement = article.querySelector('img');

                    const title = titleElement ? titleElement.innerText.trim() : '';
                    const url = titleElement ? titleElement.href : '';
                    const author = authorElement ? authorElement.innerText.trim() : 'Unknown';
                    const time = timeElement ? timeElement.innerText.trim() : 'Unknown';
                    const description = descriptionElement ? descriptionElement.innerText.trim() : 'No description';
                    const imageUrl = imageElement ? imageElement.src : '';

                    articleList.push({ title, url, author, time, description, imageUrl });
                });
                return articleList;
            });
        };

        // Navigate to the TechCrunch homepage (first page)
        await page.goto('https://techcrunch.com/category/startups/', { waitUntil: 'load', timeout: 0 });

        // Scrape the first page
        let articles = await scrapeCurrentPage();

        // Click on the "Next" or "Page 2" button to navigate to the second page
        const nextPageSelector = 'a.wp-block-query-pagination-next'; // Modify this selector if necessary
        const isNextPageAvailable = await page.$(nextPageSelector);
        
        if (isNextPageAvailable) {
            await page.click(nextPageSelector);

            // Wait for the second page to load
            await page.waitForSelector('.wp-block-tc23-post-picker', { timeout: 60000 });

            // Scrape the second page
            const secondPageArticles = await scrapeCurrentPage();

            // Combine the results
            articles = articles.concat(secondPageArticles);
        }

        console.log(articles);
        console.log(`${articles.length} articles found.`);

        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('TechCrunch Articles');

        // Add column headers
        worksheet.columns = [
            { header: 'Title', key: 'title', width: 50 },
            { header: 'URL', key: 'url', width: 70 },
            { header: 'Author', key: 'author', width: 30 },
            { header: 'Time', key: 'time', width: 20 },
            { header: 'Description', key: 'description', width: 100 },
            { header: 'Image URL', key: 'imageUrl', width: 70 }
        ];

        // Add rows to the worksheet
        articles.forEach(article => {
            worksheet.addRow({
                title: article.title,
                url: article.url,
                author: article.author,
                time: article.time,
                description: article.description,
                imageUrl: article.imageUrl
            });
        });

        // Save the workbook to an Excel file
        await workbook.xlsx.writeFile('techCrunchArticles.xlsx');
        console.log('Excel file created successfully.');

        // // Save the data to a JSON file
        // fs.writeFileSync('techCrunchArticles.json', JSON.stringify(articles, null, 2));
        // console.log('JSON file created successfully.');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        // Close the browser
        await browser.close();
    }
};

scrapeTechCrunch();
