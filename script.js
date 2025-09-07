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
            // Show delete buttons
            document.querySelectorAll('.delete-button').forEach(button => {
                button.style.display = 'block';
            });
        } else {
            alert('Incorrect password. Please try again.');
        }
    });

    // Handle resource uploads
    loadResources(resourceList);

    resourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('resource-file');
        const descriptionInput = document.getElementById('resource-description');
        const file = fileInput.files[0];
        const description = descriptionInput.value.trim();

        if (file && description && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = () => {
                const resourceId = Date.now().toString();
                const resource = {
                    id: resourceId,
                    name: file.name,
                    description: description,
                    dataUrl: reader.result
                };

                // Save to localStorage with fallback
                let resources = [];
                if (typeof localStorage !== 'undefined') {
                    resources = JSON.parse(localStorage.getItem('resources') || '[]');
                    resources.push(resource);
                    localStorage.setItem('resources', JSON.stringify(resources));
                }

                // Display the resource
                addResource(resource, resourceList, isAdminAuthenticated);

                // Reset form
                resourceForm.reset();
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a PDF file and provide a description.');
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
                link.href = resource.dataUrl;
                link.download = resource.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else if (target.classList.contains('delete-button') && isAdminAuthenticated) {
            const resourceId = target.dataset.id;
            let resources = JSON.parse(localStorage.getItem('resources') || '[]');
            resources = resources.filter(r => r.id !== resourceId);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('resources', JSON.stringify(resources));
            }
            // Remove from DOM
            target.closest('li').remove();
        }
    });
});

function addComment(activityId, text, list) {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);

    // Save to localStorage with fallback
    if (typeof localStorage !== 'undefined') {
        const comments = JSON.parse(localStorage.getItem(`comments_${activityId}`) || '[]');
        comments.push(text);
        localStorage.setItem(`comments_${activityId}`, JSON.stringify(comments));
    }
}

function loadComments(activityId, list) {
    if (typeof localStorage !== 'undefined') {
        const comments = JSON.parse(localStorage.getItem(`comments_${activityId}`) || '[]');
        comments.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            list.appendChild(li);
        });
    }
}

function addResource(resource, list, isAdminAuthenticated) {
    const li = document.createElement('li');
    li.innerHTML = `
        <a href="#" data-id="${resource.id}" role="link" aria-label="Download ${resource.name}">${resource.name}</a>
        <p>${resource.description}</p>
        <button class="delete-button" data-id="${resource.id}" style="display: ${isAdminAuthenticated ? 'block' : 'none'};" aria-label="Delete ${resource.name}">Delete</button>
    `;
    list.appendChild(li);
}

function loadResources(list) {
    if (typeof localStorage !== 'undefined') {
        const resources = JSON.parse(localStorage.getItem('resources') || '[]');
        resources.forEach(resource => {
            addResource(resource, list, false); // Initially load without showing delete buttons
        });
    }
}