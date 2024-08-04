import React, { useEffect, useState } from 'react';
import { Constants } from './constants';
import ReactMarkdown from 'react-markdown';
import './index.css';
import { Facebook } from 'react-content-loader';

const SearchStage = {
    STARTING: "Starting search",
    QUERIED_GOOGLE: "Querying Google",
    DOWNLOADED_WEBPAGES: "Downloading Webpages",
    QUERIED_LLM: "Querying LLM",
    RESULTS_READY: "Results ready"
};

class WebSearchDocument {
    constructor(id, title, url, text = '') {
        this.id = id;
        this.title = title;
        this.url = url;
        this.text = text;
    }
};

class SearchResponse {
    constructor(success, stage, num_tokens_used, websearch_docs, answer, error_message = '') {
        this.success = success;
        this.stage = stage;
        this.num_tokens_used = num_tokens_used;
        this.websearch_docs = websearch_docs;
        this.answer = answer;
        this.error_message = error_message;
    }
};

function App() {
    const [userPrompt, setUserPrompt] = useState('');
    const [searchResponse, setSearchResponse] = useState(null);

    const resetSearch = async () => {
        setUserPrompt('');
        setSearchResponse(null);
    };

    function goHome() {
        resetSearch();
        window.scrollTo(0, 0);
        window.location.reload();
    }

    const submitSearch = async (submittedUserPrompt) => {
        setUserPrompt(submittedUserPrompt);

        let res = null;
        let error_message = '';

        try {
            res = await fetch(Constants.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_prompt: submittedUserPrompt })
            });
        } catch (error) {
            console.log("Error submitting search: " + error);
            error_message = 'ERROR! We apologize for the inconvenience.';
        }

        if (!res || !res.ok) {
            console.log('Stream response not ok');
            setSearchResponse(new SearchResponse(false, null, 0, [], '', error_message));
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let buffer = '';

        reader.read().then(function processText({ done, value }) {
            if (done) {
                console.log('Stream complete');
                return;
            }

            buffer += decoder.decode(value);
            let boundary = buffer.indexOf(Constants.JSON_STREAM_SEPARATOR);
            while (boundary !== -1) {
                let input = buffer.substring(0, boundary);
                buffer = buffer.substring(boundary + Constants.JSON_STREAM_SEPARATOR.length);
                if (input.trim() === '') {
                    return;
                }
                let result = JSON.parse(input);
                boundary = buffer.indexOf(Constants.JSON_STREAM_SEPARATOR);

                const isSuccess = result.success;
                const error_message = isSuccess ? '' : result.message;

                if (isSuccess) {
                    setSearchResponse(new SearchResponse(
                        isSuccess,
                        result.stage,
                        result.num_tokens_used,
                        result.websearch_docs.map(doc => new WebSearchDocument(doc.id, doc.title, doc.url, doc.text)),
                        result.answer
                    ));
                } else {
                    setSearchResponse(new SearchResponse(false, null, 0, [], '', error_message));
                    console.log('Error:', error_message);
                    return;
                }
            }

            reader.read().then(processText);
        });
    };

    function getDomainasWord(url) {
        const hostname = new URL(url).hostname;
        const parts = hostname.split('.');
        return parts.length > 1 ? parts[parts.length - 2] : parts[0];
    }

    function getFaviconUrl(url) {
        const parsedUrl = new URL(url);
        return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    }

    let searchExamples = [
        
    ];

    return (
        <div className="App">
            {!userPrompt && (
                <div className="input-page">
                    <div className="header">
                    <h1 id="logoText">Discover Answers with Senna</h1>
                        
                    </div>
                    
                    <div className="main-center-stuff">
                        
                        <div className="search-input-container">

                            <textarea
                                id="search-input"
                                className="search-input"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        submitSearch(e.target.value);
                                    }
                                }}
                                placeholder="Ask me anything..."
                            />
                            <div className="search-lower-bar">
                                <div className="search-lower-bar-arrow">
                                    <img
                                        className="search-submit-button"
                                        src={process.env.PUBLIC_URL + '/images/arrow_submit.svg'}
                                        alt="submit"
                                        onClick={() => {
                                            submitSearch(document.getElementById('search-input').value);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                         <div className="search-examples">
                            {searchExamples.map((example, i) => (
                                <div
                                    key={i}
                                    className="search-example"
                                    onClick={() => {
                                        submitSearch(example.text);
                                    }}
                                >
                                    <div className="search-example-text">{example.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {userPrompt && (
                <div className="results-page">
                    <div className="header">
                        <div className="logo-container">
                            <div className="header-text">Senna</div>
                        </div>
                    </div>
                    <div className="results-container">
                        {(!searchResponse || (searchResponse && searchResponse.success)) && (
                            <div className="query">{userPrompt}</div>
                        )}
                        {!searchResponse && (
                            <div className="sources">
                                <div className="sources-header animate-pulse">
                                    <div className="sources-header-text"></div>
                                </div>
                                <div className="sources-results">
                                    {[1, 2, 3, 4].map((doc, i) => (
                                        <div key={i} className="source-result animate-pulse"></div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {searchResponse && !searchResponse.success && (
                            <div className="error">
                                {searchResponse.error_message ? searchResponse.error_message : 'Error processing search, please try again.'}
                            </div>
                        )}
                        {searchResponse && searchResponse.success && searchResponse.websearch_docs && searchResponse.websearch_docs.length > 0 && (
                            <div className="sources">
                                <div className="sources-header">
                                    <div className="sources-header-text">Sources</div>
                                </div>
                                <div className="sources-results">
                                    {searchResponse.websearch_docs.map((doc, i) => (
                                        <div key={i} className="source-result">
                                            <a className="source-link" href={doc.url} rel="noopener noreferrer" target="_blank">
                                                {doc.title}
                                            </a>
                                            <div className="source-result-bottom">
                                                <img
                                                    className="favicon"
                                                    src={getFaviconUrl(doc.url)}
                                                    onError={e => {
                                                        e.target.onerror = null;
                                                        e.target.src = process.env.PUBLIC_URL + '/images/earth-blue.svg';
                                                    }}
                                                    alt="favicon"
                                                />
                                                <div className="website">{getDomainasWord(doc.url)}</div>
                                                <div className="number">{'• ' + (i + 1)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {searchResponse && searchResponse.success && !searchResponse.answer && (
                            <div className="results-loader animate-pulse">
                                <Facebook animate={true} speed={2} />
                            </div>
                        )}
                        {searchResponse && searchResponse.success && searchResponse.answer && (
                            <div className="answer">
                                <div className="answer-header">
                                    <div className="answer-header-icon">
                                        <img src={process.env.PUBLIC_URL + '/images/logo-white.svg'} alt="logo" />
                                    </div>
                                    <div className="answer-header-text">Answer</div>
                                </div>
                                <div className="answer-text">
                                    <ReactMarkdown>{searchResponse.answer}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                        <div className="new-search">
                            <button onClick={() => resetSearch()}>Ask for a follow-up...</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
