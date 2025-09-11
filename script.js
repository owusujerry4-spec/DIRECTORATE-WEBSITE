// Polyfill for `closest` for older browsers
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        let el = this;
        while (el && el !== document) {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        }
        return null;
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const commentForms = document.querySelectorAll('.comment-form');
    const backToTopButton = document.getElementById('back-to-top');
    const dropdown = document.querySelector('.dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');
    const resourceForm = document.getElementById('resource-form');
    const resourceList = document.querySelector('.resource-items');
    const authButton = document.getElementById('auth-button');
    const adminPassword = document.getElementById('admin-password');
    const ADMIN_PASSWORD = 'admin123'; // Simple password for demo purposes
    let isAdminAuthenticated = false;

    // Handle comments
    commentForms.forEach(form => {
        const commentList = form.previousElementSibling;
        const activityId = form.dataset.id;

        // Load existing comments from localStorage
        loadComments(activityId, commentList);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const textarea = form.querySelector('textarea');
            const commentText = textarea.value.trim();

            if (commentText) {
                addComment(activityId, commentText, commentList);
                textarea.value = '';
            }
        });
    });

    // Back to Top button functionality
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Dropdown toggle for mobile/small screens with touch support
    dropdown.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Touch support for dropdown
    dropdown.addEventListener('touchstart', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Close dropdown when clicking/touching outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && window.innerWidth <= 768) {
            dropdownContent.style.display = 'none';
        }
    });

    document.addEventListener('touchend', (e) => {
        if (!dropdown.contains(e.target) && window.innerWidth <= 768) {
            dropdownContent.style.display = 'none';
        }
    });

    // Handle admin authentication
    authButton.addEventListener('click', () => {
        if (adminPassword.value === ADMIN_PASSWORD) {
            isAdminAuthenticated = true;
            resourceForm.style.display = 'block';
            document.getElementById('admin-auth').style.display = 'none';
            // Show delete buttons and file paths for authenticated admin
            document.querySelectorAll('.delete-button').forEach(button => {
                button.style.display = 'block';
            });
            document.querySelectorAll('.admin-only').forEach(element => {
                element.style.display = 'block';
            });
            alert('Authentication successful. You can now upload, delete, and view file paths for resources.');
        } else {
            alert('Incorrect password. Only admins can upload, delete, or view file paths for resources.');
        }
    });

    // Handle resource uploads (admin-only)
    loadResources(resourceList);

    resourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isAdminAuthenticated) {
            alert('You must be authenticated as an admin to upload resources.');
            return;
        }

        const fileInput = document.getElementById('resource-file');
        const pathInput = document.getElementById('resource-path');
        const descriptionInput = document.getElementById('resource-description');
        const file = fileInput.files[0];
        const filePath = pathInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!file && !filePath) {
            alert('Please select a PDF file or provide a file path.');
            return;
        }

        if (description) {
            let resource = {
                id: Date.now().toString(),
                name: file ? file.name : filePath.split('/').pop() || 'Unnamed Resource',
                description: description,
                filePath: filePath || 'N/A'
            };

            if (file) {
                if (file.type !== 'application/pdf') {
                    alert('Only PDF files are allowed.');
                    return;
                }
                if (file.size > 5 * 1024 * 1024) { // Limit to 5MB
                    alert('File size exceeds 5MB limit.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    resource.dataUrl = reader.result;

                    let resources = [];
                    if (typeof localStorage !== 'undefined') {
                        try {
                            resources = JSON.parse(localStorage.getItem('resources') || '[]');
                            resources.push(resource);
                            localStorage.setItem('resources', JSON.stringify(resources));
                        } catch (e) {
                            alert('Error saving resource to localStorage. Please try again.');
                            return;
                        }
                    }

                    addResource(resource, resourceList, isAdminAuthenticated);
                    resourceForm.reset();
                    alert('Resource uploaded successfully.');
                };
                reader.onerror = () => {
                    alert('Error reading file. Please try again.');
                };
                reader.readAsDataURL(file);
            } else {
                let resources = [];
                if (typeof localStorage !== 'undefined') {
                    try {
                        resources = JSON.parse(localStorage.getItem('resources') || '[]');
                        resources.push(resource);
                        localStorage.setItem('resources', JSON.stringify(resources));
                    } catch (e) {
                        alert('Error saving resource to localStorage. Please try again.');
                        return;
                    }
                }

                addResource(resource, resourceList, isAdminAuthenticated);
                resourceForm.reset();
                alert('Resource uploaded successfully.');
            }
        } else {
            alert('Please provide a resource description.');
        }
    });

    // Handle resource downloads and deletions with event delegation
    resourceList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'A') {
            e.preventDefault();
            const resourceId = target.dataset.id;
            const resources = JSON.parse(localStorage.getItem('resources') || '[]');
            const resource = resources.find(r => r.id === resourceId);
            if (resource) {
                const link = document.createElement('a');
                link.href = resource.dataUrl || resource.filePath;
                link.download = resource.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Resource not found.');
            }
        } else if (target.classList.contains('delete-button') && isAdminAuthenticated) {
            const resourceId = target.dataset.id;
            let resources = JSON.parse(localStorage.getItem('resources') || '[]');
            resources = resources.filter(r => r.id !== resourceId);
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('resources', JSON.stringify(resources));
                } catch (e) {
                    alert('Error deleting resource from localStorage. Please try again.');
                    return;
                }
            }
            target.closest('li').remove();
            alert('Resource deleted successfully.');
        }
    });
});

function addComment(activityId, text, list) {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);

    if (typeof localStorage !== 'undefined') {
        try {
            const comments = JSON.parse(localStorage.getItem(`comments_${activityId}`) || '[]');
            comments.push(text);
            localStorage.setItem(`comments_${activityId}`, JSON.stringify(comments));
        } catch (e) {
            console.error('Error saving comment to localStorage:', e);
        }
    }
}

function loadComments(activityId, list) {
    if (typeof localStorage !== 'undefined') {
        try {
            const comments = JSON.parse(localStorage.getItem(`comments_${activityId}`) || '[]');
            comments.forEach(text => {
                const li = document.createElement('li');
                li.textContent = text;
                list.appendChild(li);
            });
        } catch (e) {
            console.error('Error loading comments from localStorage:', e);
        }
    }
}

function addResource(resource, list, isAdminAuthenticated) {
    const li = document.createElement('li');
    li.innerHTML = `
        <a href="${resource.dataUrl || resource.filePath}" data-id="${resource.id}" role="link" aria-label="Download ${resource.name}">${resource.name}</a>
        <p>${resource.description}</p>
        <p class="admin-only"><strong>File Path:</strong> ${resource.filePath || 'N/A'}</p>
        <button class="delete-button" data-id="${resource.id}" style="display: ${isAdminAuthenticated ? 'block' : 'none'};" aria-label="Delete ${resource.name}">Delete</button>
    `;
    list.appendChild(li);
}

function loadResources(list) {
    if (typeof localStorage !== 'undefined') {
        try {
            const resources = JSON.parse(localStorage.getItem('resources') || '[]');
            resources.forEach(resource => {
                addResource(resource, list, false);
            });
        } catch (e) {
            console.error('Error loading resources from localStorage:', e);
        }
    }
}